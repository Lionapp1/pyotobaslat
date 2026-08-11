import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeProject, detectFramework, formatReport } from './projectDoctor';

let output: vscode.OutputChannel;

function rootPath(): string | undefined { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; }
function pythonPath(root: string): string {
    const win = process.platform === 'win32';
    const candidates = [path.join(root, '.venv', win ? 'Scripts/python.exe' : 'bin/python'), path.join(root, 'venv', win ? 'Scripts/python.exe' : 'bin/python')];
    return candidates.find(fs.existsSync) || (win ? 'python' : 'python3');
}
function run(command: string, args: string[], cwd: string, timeout = 180000): Promise<string> {
    return new Promise((resolve, reject) => execFile(command, args, { cwd, timeout, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
        const text = (stdout || stderr || error?.message || '').trim();
        if (error) reject(new Error(text)); else resolve(text);
    }));
}
function ensureGitignore(root: string): void {
    const file = path.join(root, '.gitignore');
    const wanted = ['.venv/', 'venv/', '__pycache__/', '.pytest_cache/', '.mypy_cache/', '.ruff_cache/', '.env'];
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const lines = current.split(/\r?\n/); const add = wanted.filter(x => !lines.includes(x));
    if (add.length) fs.writeFileSync(file, `${current.trimEnd()}\n${add.join('\n')}\n`);
}
function entry(root: string, framework: string): string | undefined {
    if (framework === 'django' && fs.existsSync(path.join(root, 'manage.py'))) return 'manage.py';
    for (const name of ['main.py', 'app.py', 'run.py']) if (fs.existsSync(path.join(root, name))) return name;
    try { return fs.readdirSync(root).find(x => x.endsWith('.py')); } catch { return undefined; }
}

const IMPORT_TO_PACKAGE: Record<string, string> = {
    cv2: 'opencv-python', PIL: 'Pillow', sklearn: 'scikit-learn', yaml: 'PyYAML', dotenv: 'python-dotenv',
    bs4: 'beautifulsoup4', rest_framework: 'djangorestframework', django_filters: 'django-filter',
    flask_cors: 'flask-cors', flask_sqlalchemy: 'flask-sqlalchemy', jwt: 'PyJWT', jose: 'python-jose',
    serial: 'pyserial', fitz: 'PyMuPDF', docx: 'python-docx', psycopg2: 'psycopg2-binary', requests: 'requests',
    httpx: 'httpx', aiohttp: 'aiohttp', sqlalchemy: 'SQLAlchemy', pymongo: 'pymongo', redis: 'redis', openai: 'openai',
    anthropic: 'anthropic', transformers: 'transformers', torch: 'torch', pandas: 'pandas', numpy: 'numpy',
    matplotlib: 'matplotlib', plotly: 'plotly', pytest: 'pytest', rich: 'rich', psutil: 'psutil',
    PySide6: 'PySide6', PyQt6: 'PyQt6', PyQt5: 'PyQt5', lxml: 'lxml', magic: 'python-magic', bcrypt: 'bcrypt',
    cryptography: 'cryptography', jinja2: 'Jinja2', werkzeug: 'Werkzeug', uvicorn: 'uvicorn', gunicorn: 'gunicorn',
    fastapi: 'fastapi', flask: 'Flask', django: 'Django', streamlit: 'streamlit', celery: 'celery',
    websockets: 'websockets', pydantic: 'pydantic'
};

async function findMissingImports(root: string, imports: string[]): Promise<string[]> {
    const candidates = [...new Set(imports.filter(name => IMPORT_TO_PACKAGE[name]))];
    if (!candidates.length) return [];
    const python = pythonPath(root);
    const script = [
        'import importlib.util, sys',
        'missing=[]',
        'for name in sys.argv[1:]:',
        '    try:',
        '        if importlib.util.find_spec(name) is None: missing.append(name)',
        '    except (ImportError, ModuleNotFoundError, ValueError): missing.append(name)',
        'print("\\n".join(missing))'
    ].join('; ');
    try {
        const result = await run(python, ['-c', script, ...candidates], root);
        return result.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    } catch (e: any) {
        output.appendLine(`⚠️ Import kontrolü başarısız: ${e.message}`);
        return candidates;
    }
}

async function repairMissingModules(root: string, imports: string[], progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
    const missingImports = await findMissingImports(root, imports);
    const packages = [...new Set(missingImports.map(name => IMPORT_TO_PACKAGE[name]).filter(Boolean))];
    if (!packages.length) return;
    const python = pythonPath(root);
    output.appendLine(`📦 Eksik Python modülleri: ${missingImports.join(', ')}`);
    output.appendLine(`📦 Kurulacak paketler: ${packages.join(', ')}`);
    progress?.report({ message: `${packages.join(', ')} kuruluyor...` });
    try {
        await run(python, ['-m', 'pip', 'install', ...packages], root, 600000);
        output.appendLine(`✅ Paketler kuruldu: ${packages.join(', ')}`);
        const stillMissing = await findMissingImports(root, missingImports);
        if (stillMissing.length) throw new Error(`Kurulumdan sonra hâlâ eksik: ${stillMissing.join(', ')}`);
    } catch (e: any) {
        throw new Error(`Eksik Python modülleri otomatik kurulamadı: ${e.message}`);
    }
}

function launch(root: string): void {
    const configured = vscode.workspace.getConfiguration('pyotobaslat').get<string>('calistirmaModu', 'otomatik');
    const framework = configured === 'otomatik' ? detectFramework(root) : configured;
    const file = entry(root, framework); if (!file) throw new Error('Çalıştırılacak Python dosyası bulunamadı.');
    const interpreter = pythonPath(root);
    let command = `${interpreter} ${file}`;
    if (framework === 'django' && file === 'manage.py') command = `${interpreter} manage.py runserver`;
    else if (framework === 'fastapi') command = `${interpreter} -m uvicorn main:app --reload`;
    else if (framework === 'flask') command = `${interpreter} -m flask run`;
    else if (framework === 'streamlit') command = `${interpreter} -m streamlit run ${file}`;
    const term = vscode.window.terminals.find(t => t.name === '🐍 PyOtoBaşlat') || vscode.window.createTerminal('🐍 PyOtoBaşlat');
    term.sendText(command); term.show();
}

async function doctor(root: string): Promise<void> {
    const report = analyzeProject(root); const markdown = formatReport(report);
    output.appendLine(markdown); output.show(true);
    const doc = await vscode.workspace.openTextDocument({ content: markdown, language: 'markdown' });
    await vscode.window.showTextDocument(doc, { preview: false });
}

async function prepare(root: string): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('pyotobaslat');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: '🐍 PyOtoBaşlat hazırlanıyor...', cancellable: false }, async progress => {
        const venv = path.join(root, '.venv');
        if (cfg.get('venvOtomatikOlustur', true) && !fs.existsSync(venv)) {
            progress.report({ message: 'Sanal ortam oluşturuluyor...' });
            await run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', '.venv'], root, 300000);
        }
        ensureGitignore(root);
        const python = pythonPath(root);
        if (cfg.get('otomatikKurulum', true) && fs.existsSync(path.join(root, 'requirements.txt'))) {
            progress.report({ message: 'requirements.txt kuruluyor...' });
            try {
                await run(python, ['-m', 'pip', 'install', '-r', 'requirements.txt'], root, 600000);
            } catch (e: any) {
                output.appendLine(`⚠️ requirements.txt kurulumu tamamlanamadı: ${e.message}`);
                vscode.window.showWarningMessage('requirements.txt içinde hata var; eksik importlar yine de otomatik onarılacak.');
            }
        }
        if (cfg.get('otomatikPaketKontrol', true)) {
            const report = analyzeProject(root);
            await repairMissingModules(root, report.imports, progress);
        }
    });
    launch(root);
}

async function security(root: string): Promise<void> {
    const p = pythonPath(root);
    try { output.appendLine('🔒 pip-audit\n' + await run(p, ['-m', 'pip_audit'], root)); }
    catch (e: any) { output.appendLine('🔒 pip-audit\n' + e.message); vscode.window.showWarningMessage('pip-audit çalışmadı.'); }
    output.show(true);
}
async function quality(root: string): Promise<void> {
    const tool = vscode.workspace.getConfiguration('pyotobaslat').get<string>('kodKalitesiAraci', 'ruff');
    try { output.appendLine(`✨ ${tool}\n` + await run(tool, ['check', '.'], root)); } catch (e: any) { output.appendLine(`✨ ${tool}\n` + e.message); }
    output.show(true);
}
async function tests(root: string): Promise<void> {
    const runner = vscode.workspace.getConfiguration('pyotobaslat').get<string>('testCalistirici', 'pytest');
    const args = runner === 'unittest' ? ['-m', 'unittest', 'discover', '-v'] : ['-m', 'pytest', '-q'];
    try { output.appendLine('🧪 Testler\n' + await run(pythonPath(root), args, root)); } catch (e: any) { output.appendLine('🧪 Testler\n' + e.message); }
    output.show(true);
}
async function performance(root: string): Promise<void> {
    const file = entry(root, detectFramework(root)); if (!file) throw new Error('Profil edilecek dosya bulunamadı.');
    output.appendLine('⚡ cProfile\n' + await run(pythonPath(root), ['-m', 'cProfile', '-s', 'cumulative', file], root)); output.show(true);
}

export function activate(context: vscode.ExtensionContext): void {
    output = vscode.window.createOutputChannel('PyOtoBaşlat'); context.subscriptions.push(output);
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100); status.command = 'pyotobaslat.projeSaglikKontrolu'; context.subscriptions.push(status);
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
    register('pyotobaslat.paketleriGuncelle', async () => {
        const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.');
        const report = analyzeProject(r); await repairMissingModules(r, report.imports);
        vscode.window.showInformationMessage('📦 Eksik Python modülleri kontrol edildi ve gerekli paketler kuruldu.');
    });
    register('pyotobaslat.ortamiTemizle', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); const target = path.join(r, '.venv'); if (!fs.existsSync(target)) return; const ok = await vscode.window.showWarningMessage('.venv silinecek.', 'Sil', 'İptal'); if (ok === 'Sil') fs.rmSync(target, { recursive: true, force: true }); });
    register('pyotobaslat.ayarlarAc', async () => { await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:Lionapp1.pyotobaslat'); });
    register('pyotobaslat.hataIstatistikleri', async () => { const r = rootPath(); if (!r) throw new Error('Önce proje klasörü açın.'); await doctor(r); });
}
export function deactivate(): void { output?.dispose(); }
