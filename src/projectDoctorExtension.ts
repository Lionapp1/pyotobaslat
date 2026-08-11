import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeProject, detectFramework, formatReport, IMPORT_TO_PACKAGE } from './projectDoctor';

let output: vscode.OutputChannel;
function rootPath(): string | undefined { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; }
function venvPython(root: string): string | undefined {
    const win = process.platform === 'win32';
    const candidates = [path.join(root, '.venv', win ? 'Scripts/python.exe' : 'bin/python'), path.join(root, 'venv', win ? 'Scripts/python.exe' : 'bin/python')];
    return candidates.find(fs.existsSync);
}
function pythonPath(root: string): string { return venvPython(root) || (process.platform === 'win32' ? 'python' : 'python3'); }
function run(command: string, args: string[], cwd: string, timeout = 180000): Promise<string> {
    return new Promise((resolve, reject) => execFile(command, args, { cwd, timeout, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
        const text = `${stdout || ''}\n${stderr || ''}`.trim();
        if (error) reject(new Error(text || error.message)); else resolve(text);
    }));
}
async function selectProjectInterpreter(root: string): Promise<void> {
    const interpreter = venvPython(root); if (!interpreter) return;
    const config = vscode.workspace.getConfiguration('python');
    const current = config.get<string>('defaultInterpreterPath');
    if (current !== interpreter) {
        await config.update('defaultInterpreterPath', interpreter, vscode.ConfigurationTarget.Workspace);
        output.appendLine(`🐍 Python yorumlayıcısı .venv olarak seçildi: ${interpreter}`);
    }
}
function activateVenvCommand(root: string): string {
    const win = process.platform === 'win32';
    if (win) return `$env:VIRTUAL_ENV="${path.join(root, '.venv')}"; $env:PATH="${path.join(root, '.venv', 'Scripts')};$env:PATH"`;
    return `source ${JSON.stringify(path.join(root, '.venv', 'bin', 'activate'))}`;
}
function ensureGitignore(root: string): void {
    const file = path.join(root, '.gitignore'); const wanted = ['.venv/', 'venv/', '__pycache__/', '.pytest_cache/', '.mypy_cache/', '.ruff_cache/', '.env'];
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; const lines = current.split(/\r?\n/); const add = wanted.filter(x => !lines.includes(x));
    if (add.length) fs.writeFileSync(file, `${current.trimEnd()}\n${add.join('\n')}\n`);
}
function entry(root: string, framework: string): string | undefined {
    if (framework === 'django' && fs.existsSync(path.join(root, 'manage.py'))) return 'manage.py';
    for (const name of ['main.py', 'app.py', 'run.py']) if (fs.existsSync(path.join(root, name))) return name;
    try { return fs.readdirSync(root).find(x => x.endsWith('.py')); } catch { return undefined; }
}
async function findMissingImports(root: string, imports: string[]): Promise<string[]> {
    const candidates = [...new Set(imports.filter(name => Boolean(IMPORT_TO_PACKAGE[name])))]; if (!candidates.length) return [];
    const script = ['import importlib.util', 'import sys', 'missing = []', 'for name in sys.argv[1:]:', '    try:', '        if importlib.util.find_spec(name) is None:', '            missing.append(name)', '    except (ImportError, ModuleNotFoundError, ValueError):', '        missing.append(name)', 'print("\\n".join(missing))'].join('\n');
    try { const result = await run(pythonPath(root), ['-c', script, ...candidates], root, 30000); return result.split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
    catch (e: any) { output.appendLine(`Import kontrolü başarısız: ${e.message}`); return candidates; }
}
async function installPackages(root: string, packages: string[], progress?: vscode.Progress<{ message?: string }>): Promise<void> {
    const unique = [...new Set(packages)]; if (!unique.length) return;
    progress?.report({ message: `${unique.join(', ')} kuruluyor...` }); output.appendLine(`Kuruluyor: ${unique.join(', ')}`);
    await run(pythonPath(root), ['-m', 'pip', 'install', '--disable-pip-version-check', ...unique], root, 600000);
}
async function repairPackages(root: string, imports: string[], progress?: vscode.Progress<{ message?: string }>): Promise<void> {
    const missingImports = await findMissingImports(root, imports); const packages = [...new Set(missingImports.map(name => IMPORT_TO_PACKAGE[name]).filter(Boolean))] as string[];
    if (!packages.length) return; output.appendLine(`Eksik modüller: ${missingImports.join(', ')}`); await installPackages(root, packages, progress);
    const stillMissing = await findMissingImports(root, missingImports); if (stillMissing.length) throw new Error(`Kurulumdan sonra hâlâ eksik: ${stillMissing.join(', ')}`);
}
function extractMissingModules(errorText: string): string[] { return [...new Set([...errorText.matchAll(/ModuleNotFoundError:\s+No module named ['\"]([^'\"]+)['\"]/g)].map(m => m[1].split('.')[0]))]; }
async function repairRuntimeError(root: string, errorText: string, progress?: vscode.Progress<{ message?: string }>): Promise<boolean> {
    const imports = extractMissingModules(errorText); if (!imports.length) return false;
    const packages = [...new Set(imports.map(name => IMPORT_TO_PACKAGE[name]).filter(Boolean))] as string[];
    if (!packages.length) { output.appendLine(`Güvenli PyPI eşleşmesi yok: ${imports.join(', ')}`); return false; }
    try { await installPackages(root, packages, progress); const stillMissing = await findMissingImports(root, imports); if (stillMissing.length) return false; output.appendLine('Çalışma zamanı eksik modül onarıldı.'); return true; }
    catch (e: any) { output.appendLine(`Otomatik kurulum başarısız: ${e.message}`); return false; }
}
async function ensureTooling(root: string): Promise<void> {
    const python = pythonPath(root);
    try { await run(python, ['-m', 'ruff', '--version'], root, 30000); }
    catch { try { await run(python, ['-m', 'pip', 'install', '--disable-pip-version-check', 'ruff'], root, 300000); } catch (e: any) { output.appendLine(`Ruff kurulamadı: ${e.message}`); } }
}
async function autoFixPython(root: string): Promise<void> {
    await ensureTooling(root); const python = pythonPath(root);
    try { const result = await run(python, ['-m', 'ruff', 'check', '.', '--fix'], root, 300000); if (result) output.appendLine(result); }
    catch (e: any) { output.appendLine(`Ruff düzeltme sonucu: ${e.message}`); }
    try { await run(python, ['-m', 'compileall', '-q', '.'], root, 300000); output.appendLine('Python syntax kontrolü başarılı.'); }
    catch (e: any) { output.appendLine(`Python syntax hatası bulundu: ${e.message}`); throw new Error('Python kodunda otomatik düzeltilemeyen bir syntax hatası var. Çıktıyı inceleyin.'); }
}
function launchCommand(root: string, framework: string, file: string): { command: string; args: string[] } {
    const interpreter = pythonPath(root);
    if (framework === 'django' && file === 'manage.py') return { command: interpreter, args: ['manage.py', 'runserver'] };
    if (framework === 'fastapi') return { command: interpreter, args: ['-m', 'uvicorn', 'main:app', '--reload'] };
    if (framework === 'flask') return { command: interpreter, args: ['-m', 'flask', 'run'] };
    if (framework === 'streamlit') return { command: interpreter, args: ['-m', 'streamlit', 'run', file] };
    return { command: interpreter, args: [file] };
}
async function launch(root: string): Promise<void> {
    await selectProjectInterpreter(root);
    const configured = vscode.workspace.getConfiguration('pyotobaslat').get<string>('calistirmaModu', 'otomatik'); const framework = configured === 'otomatik' ? detectFramework(root) : configured;
    const file = entry(root, framework); if (!file) throw new Error('Çalıştırılacak Python dosyası bulunamadı.'); const spec = launchCommand(root, framework, file);
    const term = vscode.window.terminals.find(t => t.name === '🐍 PyOtoBaşlat') || vscode.window.createTerminal('🐍 PyOtoBaşlat');
    const activation = venvPython(root) ? activateVenvCommand(root) : '';
    if (activation) term.sendText(activation, true);
    term.sendText([spec.command, ...spec.args].map(x => /\s/.test(x) ? JSON.stringify(x) : x).join(' '), true); term.show();
}
async function doctor(root: string): Promise<void> { const report = analyzeProject(root); const markdown = formatReport(report); output.appendLine(markdown); output.show(true); const doc = await vscode.workspace.openTextDocument({ content: markdown, language: 'markdown' }); await vscode.window.showTextDocument(doc, { preview: false }); }
async function prepare(root: string): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('pyotobaslat');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'PyOtoBaşlat hazırlanıyor...', cancellable: false }, async progress => {
        const venv = path.join(root, '.venv'); if (cfg.get('venvOtomatikOlustur', true) && !fs.existsSync(venv)) { progress.report({ message: 'Sanal ortam oluşturuluyor...' }); await run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', '.venv'], root, 300000); }
        ensureGitignore(root); await selectProjectInterpreter(root); const python = pythonPath(root);
        try { await run(python, ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'], root, 300000); } catch (e: any) { output.appendLine(`pip araçları güncellenemedi: ${e.message}`); }
        if (cfg.get('otomatikKurulum', true) && fs.existsSync(path.join(root, 'requirements.txt'))) { progress.report({ message: 'requirements.txt kuruluyor...' }); try { await run(python, ['-m', 'pip', 'install', '-r', 'requirements.txt'], root, 600000); } catch (e: any) { output.appendLine(`requirements.txt kurulumu tamamlanamadı: ${e.message}`); vscode.window.showWarningMessage('requirements.txt içinde hata var; eksik importlar otomatik onarılacak.'); } }
        if (cfg.get('otomatikPaketKontrol', true)) { const report = analyzeProject(root); await repairPackages(root, report.imports, progress); }
        if (cfg.get('selfHealingAktif', true)) await autoFixPython(root);
    });
    await launch(root);
}
async function security(root: string): Promise<void> { try { output.appendLine('pip-audit\n' + await run(pythonPath(root), ['-m', 'pip_audit'], root)); } catch (e: any) { output.appendLine('pip-audit\n' + e.message); vscode.window.showWarningMessage('pip-audit çalışmadı.'); } output.show(true); }
async function quality(root: string): Promise<void> { const tool = vscode.workspace.getConfiguration('pyotobaslat').get<string>('kodKalitesiAraci', 'ruff'); try { output.appendLine(`${tool}\n` + await run(pythonPath(root), ['-m', tool, 'check', '.'], root)); } catch (e: any) { output.appendLine(`${tool}\n` + e.message); } output.show(true); }
async function tests(root: string): Promise<void> { const runner = vscode.workspace.getConfiguration('pyotobaslat').get<string>('testCalistirici', 'pytest'); const args = runner === 'unittest' ? ['-m', 'unittest', 'discover', '-v'] : ['-m', 'pytest', '-q']; try { output.appendLine('Testler\n' + await run(pythonPath(root), args, root)); } catch (e: any) { output.appendLine('Testler\n' + e.message); } output.show(true); }
async function performance(root: string): Promise<void> { const file = entry(root, detectFramework(root)); if (!file) throw new Error('Profil edilecek dosya bulunamadı.'); output.appendLine('cProfile\n' + await run(pythonPath(root), ['-m', 'cProfile', '-s', 'cumulative', file], root)); output.show(true); }
export function activate(context: vscode.ExtensionContext): void {
    output = vscode.window.createOutputChannel('PyOtoBaşlat'); context.subscriptions.push(output); const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100); status.command = 'pyotobaslat.projeSaglikKontrolu'; context.subscriptions.push(status);
    const refresh = () => { const root = rootPath(); if (!root) { status.text = '$(circle-slash) PyOtoBaşlat'; status.show(); return; } const r = analyzeProject(root); const errors = r.findings.filter(x => x.severity === 'error').length; const warnings = r.findings.filter(x => x.severity === 'warning').length; status.text = errors ? `$(error) PyOtoBaşlat ${errors}` : warnings ? `$(warning) PyOtoBaşlat ${warnings}` : '$(check) PyOtoBaşlat'; status.show(); };
    refresh(); context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(refresh)); context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refresh));
    const register = (id: string, fn: () => Promise<void>) => context.subscriptions.push(vscode.commands.registerCommand(id, async () => { try { await fn(); refresh(); } catch (e: any) { output.appendLine(`[ERROR] ${e.message}`); output.show(true); vscode.window.showErrorMessage(`PyOtoBaşlat: ${e.message}`); } }));
    register('pyotobaslat.hazirlaVeCalistir', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await prepare(r); });
    register('pyotobaslat.koduDuzelt', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await autoFixPython(r); vscode.window.showInformationMessage('Python kodu tarandı, güvenli otomatik düzeltmeler uygulandı ve syntax kontrol edildi.'); });
    register('pyotobaslat.projeSaglikKontrolu', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await doctor(r); });
    register('pyotobaslat.guvenlikTaramasi', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await security(r); });
    register('pyotobaslat.kodKalitesi', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await quality(r); });
    register('pyotobaslat.testleriCalistir', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await tests(r); });
    register('pyotobaslat.performansAnalizi', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await performance(r); });
    register('pyotobaslat.paketleriGuncelle', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); const report = analyzeProject(r); await repairPackages(r, report.imports); vscode.window.showInformationMessage('Eksik Python modülleri kontrol edildi ve gerekli paketler kuruldu.'); });
    register('pyotobaslat.ortamiTemizle', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); const target = path.join(r, '.venv'); if (!fs.existsSync(target)) return; const ok = await vscode.window.showWarningMessage('.venv silinecek.', 'Sil', 'İptal'); if (ok === 'Sil') fs.rmSync(target, { recursive: true, force: true }); });
    register('pyotobaslat.ayarlarAc', async () => { await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:Lionapp1.pyotobaslat'); });
    register('pyotobaslat.hataIstatistikleri', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await doctor(r); });
}
export function deactivate(): void { output?.dispose(); }
