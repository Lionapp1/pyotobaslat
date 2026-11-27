import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
    analyzeProject, detectFramework, formatReport,
    type Framework, type ProjectReport
} from './projectDoctor';
import { IMPORT_TO_PACKAGE, normalizePackageName } from './packageMap';
import {
    ensureGitignore, ensureTool, ensureVenv, findVenvPython, installPackages,
    launchSpec, missingImports, run, upgradePipTooling, venvPython
} from './pythonEnv';
import {
    healthHtml, performanceHtml, statisticsHtml,
    type ErrorStat, type HealthItem
} from './webviews';

let output: vscode.OutputChannel;

function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    const text = message.trim();
    if (text) { output?.appendLine(`[${new Date().toLocaleTimeString('tr-TR')}] [${level}] ${text}`); }
}

function rootPath(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('pyotobaslat');
}

function entryFile(root: string, framework: Framework): string | undefined {
    if (framework === 'django' && fs.existsSync(path.join(root, 'manage.py'))) { return 'manage.py'; }
    let pythonFiles: string[] = [];
    try {
        pythonFiles = fs.readdirSync(root)
            .filter(name => name.endsWith('.py') && name !== 'manage.py')
            .sort();
    } catch { return undefined; }
    if (framework === 'fastapi') {
        const fastapiFile = pythonFiles.find(name => {
            try {
                return /FastAPI\s*\(|from\s+fastapi\s+import/.test(fs.readFileSync(path.join(root, name), 'utf8'));
            } catch { return false; }
        });
        if (fastapiFile) { return fastapiFile; }
    }
    for (const name of ['main.py', 'app.py', 'run.py']) {
        if (pythonFiles.includes(name)) { return name; }
    }
    return pythonFiles[0];
}

async function confirmNoDirtyFiles(): Promise<boolean> {
    const dirty = vscode.workspace.textDocuments.filter(
        document => document.isDirty && document.languageId === 'python'
    );
    if (dirty.length === 0) { return true; }
    const choice = await vscode.window.showWarningMessage(
        `${dirty.length} Python dosyasında kaydedilmemiş değişiklik var. Otomatik düzeltme bu dosyaları da değiştirebilir.`,
        'Kaydedip devam et', 'Yine de düzelt', 'İptal'
    );
    if (choice === 'Kaydedip devam et') {
        await Promise.all(dirty.map(document => document.save()));
        return true;
    }
    return choice === 'Yine de düzelt';
}

async function selectInterpreter(root: string, python: string): Promise<void> {
    if (!config().get<boolean>('pythonYorumlayiciyiSec', true)) { return; }
    const settings = vscode.workspace.getConfiguration('python');
    const current = settings.get<string>('defaultInterpreterPath');
    if (current === python) { return; }
    await settings.update('defaultInterpreterPath', python, vscode.ConfigurationTarget.Workspace);
    log(`Python yorumlayıcısı seçildi: ${python}`);
}

interface Solution {
    title: string;
    detail: string;
    fix?: 'pip_install' | 'build_deps';
}

const ERROR_RULES: Array<{ pattern: RegExp; solution: Solution }> = [
    {
        pattern: /ModuleNotFoundError|No module named ['"]/,
        solution: { title: 'Eksik modül', detail: 'Bir Python modülü bulunamadı. Bilinen eşleşmeler otomatik kurulabilir.', fix: 'pip_install' }
    },
    {
        pattern: /subprocess-exited-with-error|Failed building wheel|Getting requirements to build wheel/,
        solution: { title: 'Paket derleme hatası', detail: 'Paket derlenemedi. pip/setuptools/wheel güncellenerek tekrar denenebilir.', fix: 'build_deps' }
    },
    {
        pattern: /No matching distribution found|Could not find a version that satisfies/,
        solution: { title: 'Uyumsuz sürüm', detail: 'Paket bu Python sürümü veya platform için uygun değil.' }
    },
    { pattern: /SyntaxError|IndentationError/, solution: { title: 'Söz dizimi hatası', detail: 'Python dosyasındaki satırı kontrol edin.' } },
    { pattern: /PermissionError/, solution: { title: 'İzin hatası', detail: 'Dosya izinlerini veya sanal ortamı kontrol edin.' } },
    { pattern: /ReadTimeout|ConnectionError|ConnectionReset/, solution: { title: 'Bağlantı hatası', detail: 'İnternet bağlantısını veya pip kaynağını kontrol edin.' } },
    { pattern: /Address already in use/, solution: { title: 'Port meşgul', detail: 'Başka bir uygulama aynı portu kullanıyor.' } }
];

function classify(message: string): Solution | undefined {
    return ERROR_RULES.find(rule => rule.pattern.test(message))?.solution;
}

function recordStat(context: vscode.ExtensionContext, errorType: string, root: string): void {
    if (!config().get<boolean>('hataIstatistikleriKaydet', true)) { return; }
    const stats = context.globalState.get<Record<string, ErrorStat>>('errorStats', {});
    const previous = stats[errorType];
    stats[errorType] = {
        errorType,
        count: (previous?.count || 0) + 1,
        lastDate: new Date().toLocaleString('tr-TR'),
        project: path.basename(root)
    };
    void context.globalState.update('errorStats', stats);
}

function reportFailure(
    context: vscode.ExtensionContext,
    error: unknown,
    root: string,
    record = true
): { message: string; solution?: Solution } {
    const message = error instanceof Error ? error.message : String(error);
    const solution = config().get<boolean>('hataCevirmeniAktif', true) ? classify(message) : undefined;
    if (record) { recordStat(context, solution?.title || 'Bilinmeyen hata', root); }
    log(`${solution?.title || 'Hata'}: ${message}`, 'ERROR');
    return { message, solution };
}

async function notifyFailure(context: vscode.ExtensionContext, error: unknown, root: string): Promise<void> {
    const { message, solution } = reportFailure(context, error, root);
    const choice = await vscode.window.showErrorMessage(
        `PyOtoBaşlat: ${solution?.detail || message}`,
        'Detaylı Yardım', 'Anladım'
    );
    if (choice === 'Detaylı Yardım') {
        void vscode.env.openExternal(vscode.Uri.parse('https://docs.python.org/3/library/exceptions.html'));
    }
}

async function healInstallError(root: string, message: string, progress: vscode.Progress<{ message?: string }>): Promise<boolean> {
    const solution = classify(message);
    if (solution?.fix === 'build_deps') {
        progress.report({ message: 'Build araçları güncelleniyor...' });
        await upgradePipTooling(root, msg => log(msg));
        return true;
    }
    if (solution?.fix === 'pip_install') {
        const modules = [...message.matchAll(/No module named ['"]([\w.]+)['"]/g)]
            .map(match => match[1].split('.')[0]);
        const packages = [...new Set(modules.map(name => IMPORT_TO_PACKAGE[name]).filter(Boolean))] as string[];
        if (packages.length === 0) { return false; }
        progress.report({ message: `Eksik paketler kuruluyor: ${packages.join(', ')}` });
        await installPackages(root, packages, msg => log(msg));
        return true;
    }
    return false;
}

function appendRequirements(root: string, packages: string[]): void {
    const file = path.join(root, 'requirements.txt');
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const declared = new Set(
        current.split(/\r?\n/)
            .map(line => line.split('#')[0].trim())
            .filter(line => line !== '' && !line.startsWith('-'))
            .map(line => line.match(/^[A-Za-z0-9][A-Za-z0-9._-]*/)?.[0])
            .filter((name): name is string => Boolean(name))
            .map(normalizePackageName)
    );
    const add = packages.filter(pkg => !declared.has(normalizePackageName(pkg)));
    if (add.length === 0) { return; }
    fs.writeFileSync(file, `${current.trimEnd()}${current.trimEnd() ? '\n' : ''}${add.join('\n')}\n`);
    log(`requirements.txt güncellendi: ${add.join(', ')}`);
}

async function repairMissingPackages(
    root: string,
    progress?: vscode.Progress<{ message?: string }>,
    quiet = false
): Promise<void> {
    const report = analyzeProject(root);
    const candidates = report.imports.filter(name => Boolean(IMPORT_TO_PACKAGE[name]));
    progress?.report({ message: 'Importlar .venv içinde doğrulanıyor...' });
    const missing = await missingImports(root, candidates);
    if (missing.length === 0) {
        if (!quiet) { void vscode.window.showInformationMessage('✅ Tüm bilinen modüller kurulu.'); }
        return;
    }
    const packages = [...new Set(missing.map(name => IMPORT_TO_PACKAGE[name]))] as string[];
    const choice = await vscode.window.showWarningMessage(
        `📦 ${missing.length} eksik modül: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`,
        "Kur ve requirements.txt'e ekle", 'Sadece kur', 'İptal'
    );
    if (!choice || choice === 'İptal') { return; }
    progress?.report({ message: `Kuruluyor: ${packages.join(', ')}` });
    await installPackages(root, packages, msg => log(msg));
    if (choice.startsWith('Kur ve')) { appendRequirements(root, packages); }
    const stillMissing = await missingImports(root, missing);
    if (stillMissing.length > 0) {
        throw new Error(`Kurulumdan sonra hâlâ eksik: ${stillMissing.join(', ')}`);
    }
    void vscode.window.showInformationMessage(`✅ ${packages.length} paket kuruldu.`);
}

async function autoFix(root: string, progress?: vscode.Progress<{ message?: string }>): Promise<void> {
    progress?.report({ message: 'Ruff hazırlanıyor...' });
    const python = await ensureTool(root, 'ruff', 'ruff', msg => log(msg));
    progress?.report({ message: 'Güvenli düzeltmeler uygulanıyor...' });
    try {
        const result = await run(python, ['-m', 'ruff', 'check', '.', '--fix'], root, 300000);
        log(result || 'Ruff: düzeltilecek sorun bulunamadı.');
    } catch (error) {
        log(`Ruff sonucu: ${error instanceof Error ? error.message : String(error)}`, 'WARN');
    }
    progress?.report({ message: 'Söz dizimi doğrulanıyor...' });
    await run(python, ['-m', 'compileall', '-q', '-x', String.raw`(\.venv|venv|node_modules|__pycache__)`, '.'], root, 300000);
    log('Python söz dizimi doğrulaması başarılı.');
}

async function envWizard(root: string, keys: string[]): Promise<void> {
    const envPath = path.join(root, '.env');
    if (keys.length === 0 || fs.existsSync(envPath)) { return; }
    const choice = await vscode.window.showInformationMessage(
        `🌍 ${keys.length} ortam değişkeni tespit edildi. .env şablonu oluşturulsun mu?`,
        'Şablon Oluştur', 'Sonra'
    );
    if (choice !== 'Şablon Oluştur') { return; }
    fs.writeFileSync(envPath, `# PyOtoBaşlat tarafından oluşturuldu\n\n${keys.map(key => `${key}=\n`).join('')}`);
    ensureGitignore(root, msg => log(msg));
    const document = await vscode.workspace.openTextDocument(envPath);
    await vscode.window.showTextDocument(document);
    log('.env şablonu oluşturuldu.');
}

async function prepare(
    context: vscode.ExtensionContext,
    root: string,
    progress: vscode.Progress<{ message?: string }>
): Promise<void> {
    const cfg = config();
    if (cfg.get<boolean>('venvOtomatikOlustur', true)) {
        await ensureVenv(root, msg => { log(msg); progress.report({ message: msg }); });
    } else {
        venvPython(root);
    }
    if (cfg.get<boolean>('gitignoreGuncelle', true)) { ensureGitignore(root, msg => log(msg)); }
    const python = venvPython(root);
    await selectInterpreter(root, python);

    if (cfg.get<boolean>('otomatikKurulum', true) && fs.existsSync(path.join(root, 'requirements.txt'))) {
        progress.report({ message: 'requirements.txt kuruluyor...' });
        try {
            await run(python, ['-m', 'pip', 'install', '-r', 'requirements.txt'], root, 600000);
            log('requirements.txt kuruldu.');
        } catch (error) {
            const { message } = reportFailure(context, error, root, false);
            if (!cfg.get<boolean>('selfHealingAktif', true) || !await healInstallError(root, message, progress)) {
                throw error;
            }
            progress.report({ message: 'Kurulum tekrar deneniyor...' });
            await run(python, ['-m', 'pip', 'install', '-r', 'requirements.txt'], root, 600000);
            log('Hata düzeltildi, requirements.txt kuruldu.');
        }
    }

    if (cfg.get<boolean>('otomatikPaketKontrol', true)) {
        await repairMissingPackages(root, progress, true);
    }

    const report = analyzeProject(root);
    if (cfg.get<boolean>('envSihirbaziAktif', true)) { await envWizard(root, report.envKeys); }
    if (cfg.get<boolean>('selfHealingAktif', true) && await confirmNoDirtyFiles()) {
        await autoFix(root, progress);
    } else if (cfg.get<boolean>('selfHealingAktif', true)) {
        log('Kaydedilmemiş dosyalar nedeniyle otomatik düzeltme atlandı.', 'WARN');
    }
}

async function launch(root: string): Promise<void> {
    const selected = config().get<string>('calistirmaModu', 'otomatik');
    const framework: Framework = selected === 'otomatik' ? detectFramework(root) : selected as Framework;
    const file = entryFile(root, framework);
    if (!file) { throw new Error('Çalıştırılacak Python dosyası bulunamadı.'); }
    const python = venvPython(root);
    const terminal = vscode.window.terminals.find(item => item.name === '🐍 PyOtoBaşlat')
        || vscode.window.createTerminal('🐍 PyOtoBaşlat');
    terminal.sendText(launchSpec(root, framework, file, python), true);
    terminal.show();
    log(`Başlatıldı: ${framework} / ${file}`);
}

async function doctorReport(root: string): Promise<void> {
    const report: ProjectReport = analyzeProject(root);
    const markdown = formatReport(report);
    log(markdown);
    const document = await vscode.workspace.openTextDocument({ content: markdown, language: 'markdown' });
    await vscode.window.showTextDocument(document, { preview: false });
}

async function healthReport(context: vscode.ExtensionContext, root: string): Promise<void> {
    const report = analyzeProject(root);
    const items: HealthItem[] = [];
    try {
        const version = await run(venvPython(root), ['--version'], root, 30000);
        items.push({ category: 'Python', status: 'ok', message: version });
    } catch {
        items.push({ category: 'Python', status: 'error', message: 'Sanal ortam Python bulunamadı.' });
    }
    items.push({
        category: 'Sanal ortam',
        status: findVenvPython(root) ? 'ok' : 'warning',
        message: findVenvPython(root) ? '.venv kullanılabilir' : '.venv bulunamadı'
    });
    items.push({
        category: 'Bağımlılıklar',
        status: report.hasRequirements || report.hasPyproject ? 'ok' : 'warning',
        message: report.hasRequirements || report.hasPyproject ? 'Manifesto mevcut' : 'requirements.txt veya pyproject.toml yok'
    });
    items.push({
        category: '.gitignore',
        status: report.hasGitignore ? 'ok' : 'warning',
        message: report.hasGitignore ? 'Mevcut' : 'Eksik; .env ve .venv riski'
    });
    try {
        const missing = await missingImports(root, report.imports.filter(name => IMPORT_TO_PACKAGE[name]));
        items.push({
            category: 'Paketler',
            status: missing.length === 0 ? 'ok' : 'error',
            message: missing.length === 0 ? 'Bilinen modüller kurulu' : `${missing.length} eksik: ${missing.slice(0, 3).join(', ')}`
        });
    } catch {
        items.push({ category: 'Paketler', status: 'warning', message: 'Tarama yapılamadı' });
    }
    try {
        const outdated = await run(venvPython(root), ['-m', 'pip', 'list', '--outdated', '--format=columns'], root, 60000);
        const count = outdated.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line !== '' && !/^(Package|-)/i.test(line)).length;
        items.push({
            category: 'Güncellik',
            status: count > 0 ? 'warning' : 'ok',
            message: count > 0 ? `${count} paket güncellenebilir` : 'Tüm paketler güncel'
        });
    } catch {
        items.push({ category: 'Güncellik', status: 'warning', message: 'Kontrol yapılamadı' });
    }
    const tests = await vscode.workspace.findFiles('**/test_*.py', '**/{.venv,node_modules}/**');
    items.push({
        category: 'Testler',
        status: tests.length > 0 ? 'ok' : 'warning',
        message: tests.length > 0 ? `${tests.length} test dosyası` : 'Test dosyası bulunamadı'
    });
    if (report.envKeys.length > 0) {
        items.push({
            category: '.env',
            status: fs.existsSync(path.join(root, '.env')) ? 'ok' : 'warning',
            message: fs.existsSync(path.join(root, '.env'))
                ? `${report.envKeys.length} değişken, dosya mevcut`
                : `${report.envKeys.length} değişken tanımlı ama .env yok`
        });
    }
    const stats = Object.values(context.globalState.get<Record<string, ErrorStat>>('errorStats', {}));
    if (stats.length > 0) {
        items.push({
            category: 'Hata geçmişi',
            status: 'info',
            message: `${stats.reduce((sum, stat) => sum + stat.count, 0)} hata kaydedildi`
        });
    }
    const panel = vscode.window.createWebviewPanel('pyotobaslatSaglik', '🏥 Proje Sağlık Raporu', vscode.ViewColumn.One, {});
    panel.webview.html = healthHtml(items);
}

async function securityScan(root: string): Promise<void> {
    const python = await ensureTool(root, 'pip_audit', 'pip-audit', msg => log(msg));
    try {
        const result = await run(python, ['-m', 'pip_audit', '--desc', 'on'], root, 300000);
        log(`pip-audit:\n${result}`);
        void vscode.window.showInformationMessage('🔒 Güvenlik taraması tamamlandı. Çıktıyı panelde görebilirsiniz.');
    } catch (error) {
        log(`pip-audit bulguları:\n${error instanceof Error ? error.message : String(error)}`, 'WARN');
        void vscode.window.showWarningMessage('🔒 Güvenlik açığı bulundu veya tarama başarısız. Çıktıyı panelde görebilirsiniz.');
    }
    output.show(true);
}

async function runTests(root: string): Promise<void> {
    const runner = config().get<string>('testCalistirici', 'pytest');
    const python = venvPython(root);
    const args = runner === 'unittest'
        ? ['-m', 'unittest', 'discover', '-v']
        : ['-m', 'pytest', '-q'];
    if (runner !== 'unittest') { await ensureTool(root, 'pytest', 'pytest', msg => log(msg)); }
    try {
        log(`Testler (${runner}):\n${await run(python, args, root, 300000)}`);
    } catch (error) {
        log(`Testler (${runner}) tamamlanamadı:\n${error instanceof Error ? error.message : String(error)}`, 'WARN');
    }
    output.show(true);
}

async function qualityCheck(root: string): Promise<void> {
    const tool = config().get<string>('kodKalitesiAraci', 'ruff');
    const python = await ensureTool(root, tool, tool, msg => log(msg));
    const args = tool === 'ruff'
        ? ['-m', 'ruff', 'check', '.']
        : tool === 'flake8'
            ? ['-m', 'flake8', '--max-line-length=120', '.']
            : ['-m', 'pylint', '--recursive=y', '--disable=C0114,C0115,C0116', '.'];
    try {
        log(`${tool}:\n${await run(python, args, root, 300000)}`);
    } catch (error) {
        log(`${tool} sonucu:\n${error instanceof Error ? error.message : String(error)}`, 'WARN');
    }
    output.show(true);
}

async function performanceProfile(root: string): Promise<void> {
    const file = entryFile(root, 'generic');
    if (!file) { throw new Error('Profil edilecek Python dosyası bulunamadı.'); }
    let result: string;
    try {
        result = await run(venvPython(root), ['-m', 'cProfile', '-s', 'cumulative', file], root, 300000);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('ncalls')) { throw error; }
        result = message;
    }
    const panel = vscode.window.createWebviewPanel(
        'pyotobaslatPerformans', '⚡ Performans Raporu', vscode.ViewColumn.One, { enableScripts: true }
    );
    panel.webview.html = performanceHtml(result);
}

async function cleanEnvironment(root: string): Promise<void> {
    const choice = await vscode.window.showWarningMessage(
        '🧹 Önbellekler (__pycache__, .pytest_cache, .mypy_cache, .ruff_cache, .tox ve .pyc) silinecek. Devam?',
        { modal: true }, 'Evet, Temizle'
    );
    if (choice !== 'Evet, Temizle') { return; }
    let deleted = 0;
    for (const name of ['__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox']) {
        const files = await vscode.workspace.findFiles(`**/${name}`, '**/{.venv,node_modules}/**');
        for (const file of files) {
            try { fs.rmSync(file.fsPath, { recursive: true, force: true }); deleted++; } catch { /* atla */ }
        }
    }
    const pycFiles = await vscode.workspace.findFiles('**/*.pyc', '**/{.venv,node_modules}/**');
    for (const file of pycFiles) {
        try { fs.unlinkSync(file.fsPath); deleted++; } catch { /* atla */ }
    }
    const python = findVenvPython(root);
    if (python) {
        try { await run(python, ['-m', 'pip', 'cache', 'purge'], root, 60000); } catch { /* atla */ }
    }
    void vscode.window.showInformationMessage(`🧹 ${deleted} öğe temizlendi.`);
}

export function activate(context: vscode.ExtensionContext): void {
    output = vscode.window.createOutputChannel('PyOtoBaşlat');
    context.subscriptions.push(output);
    log('PyOtoBaşlat başlatıldı.');

    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    status.command = 'pyotobaslat.ortamiSaglikRaporu';
    status.tooltip = 'PyOtoBaşlat: Proje Sağlık Kontrolü';
    context.subscriptions.push(status);

    const refreshStatus = (): void => {
        const root = rootPath();
        if (!root) { status.text = '$(circle-slash) PyOtoBaşlat'; status.show(); return; }
        const report = analyzeProject(root);
        const errors = report.findings.filter(item => item.severity === 'error').length;
        const warnings = report.findings.filter(item => item.severity === 'warning').length;
        status.text = errors > 0
            ? `$(error) PyOtoBaşlat ${errors}`
            : warnings > 0 ? `$(warning) PyOtoBaşlat ${warnings}` : '$(check) PyOtoBaşlat';
        status.show();
    };
    refreshStatus();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = (): void => {
        if (refreshTimer) { clearTimeout(refreshTimer); }
        refreshTimer = setTimeout(() => { refreshTimer = undefined; refreshStatus(); }, 400);
    };
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(refreshStatus),
        vscode.workspace.onDidSaveTextDocument(scheduleRefresh),
        { dispose: () => { if (refreshTimer) { clearTimeout(refreshTimer); } } }
    );

    const register = (id: string, action: () => Promise<void>): void => {
        context.subscriptions.push(vscode.commands.registerCommand(id, async () => {
            try { await action(); refreshStatus(); }
            catch (error) { await notifyFailure(context, error, rootPath() || ''); }
        }));
    };
    const requireRoot = (): string => {
        const root = rootPath();
        if (!root) { throw new Error('Önce bir proje klasörü açın.'); }
        return root;
    };

    register('pyotobaslat.hazirlaVeCalistir', async () => {
        const root = requireRoot();
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '🐍 PyOtoBaşlat', cancellable: false
        }, async progress => { await prepare(context, root, progress); });
        await launch(root);
    });
    register('pyotobaslat.koduDuzelt', async () => {
        if (!await confirmNoDirtyFiles()) { return; }
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: '✨ Güvenli düzeltme' }, async progress => {
            await autoFix(requireRoot(), progress);
        });
        void vscode.window.showInformationMessage('✅ Güvenli düzeltmeler uygulandı, söz dizimi doğrulandı.');
    });
    register('pyotobaslat.projeSaglikKontrolu', async () => { await doctorReport(requireRoot()); });
    register('pyotobaslat.hataIstatistikleri', async () => {
        const stats = Object.values(context.globalState.get<Record<string, ErrorStat>>('errorStats', {}));
        const panel = vscode.window.createWebviewPanel(
            'pyotobaslatIstatistik', '📊 Hata İstatistikleri', vscode.ViewColumn.One, {}
        );
        panel.webview.html = statisticsHtml(stats);
    });
    register('pyotobaslat.ortamiSaglikRaporu', async () => { await healthReport(context, requireRoot()); });
    register('pyotobaslat.paketleriGuncelle', async () => {
        await repairMissingPackages(requireRoot());
    });
    register('pyotobaslat.guvenlikTaramasi', async () => { await securityScan(requireRoot()); });
    register('pyotobaslat.testleriCalistir', async () => { await runTests(requireRoot()); });
    register('pyotobaslat.kodKalitesi', async () => { await qualityCheck(requireRoot()); });
    register('pyotobaslat.performansAnalizi', async () => { await performanceProfile(requireRoot()); });
    register('pyotobaslat.ortamiTemizle', async () => { await cleanEnvironment(requireRoot()); });
    register('pyotobaslat.ayarlarAc', async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:Lionapp1.pyotobaslat');
    });
}

export function deactivate(): void {
    log('PyOtoBaşlat kapatıldı.');
    output?.dispose();
}
