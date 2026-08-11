import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeProject, detectFramework, formatReport } from './projectDoctor';

let output: vscode.OutputChannel;

function rootPath(): string | undefined { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; }
function py(root: string): string {
    const win = process.platform === 'win32';
    const candidates = [path.join(root, '.venv', win ? 'Scripts/python.exe' : 'bin/python'), path.join(root, 'venv', win ? 'Scripts/python.exe' : 'bin/python')];
    return candidates.find(fs.existsSync) || (win ? 'python' : 'python3');
}
function pip(root: string): string {
    const win = process.platform === 'win32';
    const candidates = [path.join(root, '.venv', win ? 'Scripts/pip.exe' : 'bin/pip'), path.join(root, 'venv', win ? 'Scripts/pip.exe' : 'bin/pip')];
    return candidates.find(fs.existsSync) || (win ? 'python' : 'python3');
}
function run(command: string, args: string[], cwd: string, timeout = 180000): Promise<string> {
    return new Promise((resolve, reject) => execFile(command, args, { cwd, timeout, maxBuffer: 6 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(new Error((stderr || stdout || error.message).trim()));
        else resolve((stdout || stderr).trim());
    }));
}
function ensureGitignore(root: string): void {
    const file = path.join(root, '.gitignore');
    const wanted = ['.venv/', 'venv/', '__pycache__/', '.pytest_cache/', '.mypy_cache/', '.ruff_cache/', '.env'];
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const lines = current.split(/\r?\n/);
    const add = wanted.filter(x => !lines.includes(x));
    if (add.length) fs.writeFileSync(file, `${current.trimEnd()}\n${add.join('\n')}\n`);
}
function entry(root: string, framework: string): string | undefined {
    if (framework === 'django' && fs.existsSync(path.join(root, 'manage.py'))) return 'manage.py';
    for (const name of ['main.py', 'app.py', 'run.py']) if (fs.existsSync(path.join(root, name))) return name;
    try { return fs.readdirSync(root).find(x => x.endsWith('.py')); } catch { return undefined; }
}
function launch(root: string): void {
    const configured = vscode.workspace.getConfiguration('pyotobaslat').get<string>('calistirmaModu', 'otomatik');
    const framework = configured === 'otomatik' ? detectFramework(root) : configured;
    const file = entry(root, framework);
    if (!file) throw new Error('Çalıştırılacak Python dosyası bulunamadı.');
    const interpreter = fs.existsSync(py(root)) ? py(root) : (process.platform === 'win32' ? 'python' : 'python3');
    let command = `${interpreter} ${file}`;
    if (framework === 'django' && file === 'manage.py') command = `${interpreter} manage.py runserver`;
    else if (framework === 'fastapi') command = `${interpreter} -m uvicorn main:app --reload`;
    else if (framework === 'flask') command = `${interpreter} -m flask run`;
    else if (framework === 'streamlit') command = `${interpreter} -m streamlit run ${file}`;
    const term = vscode.window.terminals.find(t => t.name === '🐍 PyOtoBaşlat') || vscode.window.createTerminal('🐍 PyOtoBaşlat');
    term.sendText(command); term.show();
}
async function doctor(root: string): Promise<void> {
    const report = analyzeProject(root);
    output.appendLine(formatReport(report)); output.show(true);
    const doc = await vscode.workspace.openTextDocument({ content: formatReport(report), language: 'markdown' });
    await vscode.window.showTextDocument(doc, { preview: false });
}
async function prepare(root: string): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('pyotobaslat');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: '🐍 PyOtoBaşlat hazırlanıyor...', cancellable: false }, async progress => {
        const venv = path.join(root, '.venv');
        if (cfg.get('venvOtomatikOlustur', true) && !fs.existsSync(venv)) {
            progress.report({ message: 'Sanal ortam oluşturuluyor...' });
            await run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', '.venv'], root);
        }
        ensureGitignore(root);
        const pipPath = pip(root);
        if (cfg.get('otomatikKurulum', true) && fs.existsSync(path.join(root, 'requirements.txt'))) {
            progress.report({ message: 'requirements.txt kuruluyor...' });
            if (pipPath === 'python' || pipPath === 'python3') await run(pipPath, ['-m', 'pip', 'install', '-r', 'requirements.txt'], root);
            else await run(pipPath, ['install', '-r', 'requirements.txt'], root);
        }
        const report = analyzeProject(root);
        if (cfg.get('otomatikPaketKontrol', true) && report.missingLikelyPackages.length) {
            const answer = await vscode.window.showWarningMessage(`📦 ${report.missingLikelyPackages.length} muhtemel eksik paket: ${report.missingLikelyPackages.join(', ')}`, 'Kur', 'Yoksay');
            if (answer === 'Kur') {
                if (pipPath === 'python' || pipPath === 'python3') await run(pipPath, ['-m', 'pip', 'install', ...report.missingLikelyPackages], root);
                else await run(pipPath, ['install', ...report.missingLikelyPackages], root);
            }
        }
    });
    launch(root);
}
async function security(root: string): Promise<void> {
    const p = pip(root);
    const args = p === 'python' || p === 'python3' ? ['-m', 'pip_audit'] : ['audit'];
    try { output.appendLine('🔒 pip-audit\n' + await run(p, args, root)); }
    catch (e: any) { output.appendLine('🔒 pip-audit\n' + e.message); vscode.window.showWarningMessage('pip-audit çalışmadı. Ortamda kurulu olduğundan emin olun.'); }
    output.show(true);
}
async function quality(root: string): Promise<void> {
    const tool = vscode.workspace.getConfiguration('pyotobaslat').get<string>('kodKalitesiAraci', 'ruff');
    try { output.appendLine(`✨ ${tool}\n` + await run(tool, ['check', '.'], root)); }
    catch (e: any) { output.appendLine(`✨ ${tool}\n` + e.message); }
    output.show(true);
}
async function tests(root: string): Promise<void> {
    const runner = vscode.workspace.getConfiguration('pyotobaslat').get<string>('testCalistirici', 'pytest');
    const args = runner === 'unittest' ? ['-m', 'unittest', 'discover', '-v'] : ['-m', 'pytest', '-q'];
    try { output.appendLine('🧪 Testler\n' + await run(py(root), args, root)); }
    catch (e: any) { output.appendLine('🧪 Testler\n' + e.message); }
    output.show(true);
}
async function performance(root: string): Promise<void> {
    const file = entry(root, detectFramework(root)); if (!file) throw new Error('Profil edilecek dosya bulunamadı.');
    output.appendLine('⚡ cProfile\n' + await run(py(root), ['-m', 'cProfile', '-s', 'cumulative', file], root)); output.show(true);
}

export function activate(context: vscode.ExtensionContext): void {
    output = vscode.window.createOutputChannel('PyOtoBaşlat'); context.subscriptions.push(output);
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    status.command = 'pyotobaslat.projeSaglikKontrolu'; context.subscriptions.push(status);
    const refresh = () => {
        const root = rootPath(); if (!root) { status.text = '$(circle-slash) PyOtoBaşlat'; status.show(); return; }
        const r = analyzeProject(root); const errors = r.findings.filter(x => x.severity === 'error').length; const warnings = r.findings.filter(x => x.severity === 'warning').length;
        status.text = errors ? `$(error) PyOtoBaşlat ${errors}` : warnings ? `$(warning) PyOtoBaşlat ${warnings}` : '$(check) PyOtoBaşlat'; status.show();
    };
    refresh(); context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(refresh)); context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refresh));
    const register = (id: string, fn: () => Promise<void>) => context.subscriptions.push(vscode.commands.registerCommand(id, async () => {
        try { await fn(); refresh(); } catch (e: any) { output.appendLine(`[ERROR] ${e.message}`); output.show(true); vscode.window.showErrorMessage(`❌ PyOtoBaşlat: ${e.message}`); }
    }));
    register('pyotobaslat.hazirlaVeCalistir', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await prepare(r); });
    register('pyotobaslat.projeSaglikKontrolu', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await doctor(r); });
    register('pyotobaslat.guvenlikTaramasi', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await security(r); });
    register('pyotobaslat.kodKalitesi', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await quality(r); });
    register('pyotobaslat.testleriCalistir', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await tests(r); });
    register('pyotobaslat.performansAnalizi', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await performance(r); });
    register('pyotobaslat.paketleriGuncelle', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); const report = analyzeProject(r); if (!report.missingLikelyPackages.length) return vscode.window.showInformationMessage('📦 Eksik paket bulunmadı.'); const p = pip(r); const args = p === 'python' || p === 'python3' ? ['-m', 'pip', 'install', ...report.missingLikelyPackages] : ['install', ...report.missingLikelyPackages]; await run(p, args, r); });
    register('pyotobaslat.ortamiTemizle', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); const target = path.join(r, '.venv'); if (!fs.existsSync(target)) return; const ok = await vscode.window.showWarningMessage('.venv silinecek.', 'Sil', 'İptal'); if (ok === 'Sil') fs.rmSync(target, { recursive: true, force: true }); });
    register('pyotobaslat.ayarlarAc', async () => { await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:Lionapp1.pyotobaslat'); });
    register('pyotobaslat.hataIstatistikleri', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await doctor(r); });
}
export function deactivate(): void { output?.dispose(); }
