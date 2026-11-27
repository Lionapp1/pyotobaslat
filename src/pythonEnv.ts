import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { Framework } from './projectDoctor';
import { safePackageName } from './packageMap';

export function run(command: string, args: string[], cwd: string, timeout = 300000): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(command, args, { cwd, timeout, maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
            const output = `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.trim();
            if (error) { reject(new Error(output || error.message)); } else { resolve(output); }
        });
    });
}

export function systemPython(): string {
    return process.platform === 'win32' ? 'python' : 'python3';
}

export function findVenvPython(root: string): string | undefined {
    const win = process.platform === 'win32';
    for (const folder of ['.venv', 'venv']) {
        const candidate = path.join(root, folder, win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python');
        if (fs.existsSync(candidate)) { return candidate; }
    }
    return undefined;
}

export function venvPython(root: string): string {
    const python = findVenvPython(root);
    if (!python) { throw new Error('Sanal ortam bulunamadı. Önce .venv oluşturun.'); }
    return python;
}

export async function upgradePipTooling(root: string, log?: (message: string) => void): Promise<void> {
    log?.('pip, setuptools ve wheel güncelleniyor...');
    try {
        await run(venvPython(root), ['-m', 'pip', 'install', '--disable-pip-version-check', '--upgrade', ...indexArgs(), 'pip', 'setuptools', 'wheel'], root, 300000);
    } catch (error) {
        log?.(`pip araçları güncellenemedi: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function ensureVenv(root: string, log?: (message: string) => void): Promise<string> {
    const existing = findVenvPython(root);
    if (existing) { return existing; }
    log?.('Sanal ortam oluşturuluyor...');
    await run(systemPython(), ['-m', 'venv', '.venv'], root, 300000);
    await upgradePipTooling(root, log);
    return venvPython(root);
}

function indexArgs(): string[] {
    const custom = vscode.workspace.getConfiguration('pyotobaslat').get<string>('ozelPipKaynagi', '').trim();
    if (!custom) { return []; }
    try {
        const url = new URL(custom);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') { return []; }
        return ['--index-url', url.toString()];
    } catch { return []; }
}

const MODULE_SCRIPT = 'import importlib.util, sys\nraise SystemExit(0 if importlib.util.find_spec(sys.argv[1]) is not None else 1)';

export async function moduleAvailable(python: string, moduleName: string, cwd: string): Promise<boolean> {
    try { await run(python, ['-c', MODULE_SCRIPT, moduleName], cwd, 30000); return true; }
    catch { return false; }
}

export async function installPackages(root: string, packages: string[], log?: (message: string) => void): Promise<void> {
    const unique = [...new Set(packages.map(name => name.trim()))].filter(Boolean);
    if (unique.length === 0) { return; }
    if (unique.some(name => !safePackageName(name))) {
        throw new Error('Geçersiz paket adı: otomatik kurulum yalnızca bilinen paket adlarını kabul eder.');
    }
    const python = venvPython(root);
    log?.(`Kuruluyor: ${unique.join(', ')}`);
    await run(python, ['-m', 'pip', 'install', '--disable-pip-version-check', ...indexArgs(), ...unique], root, 600000);
}

export async function ensureTool(root: string, moduleName: string, pipName: string, log?: (message: string) => void): Promise<string> {
    const python = venvPython(root);
    if (await moduleAvailable(python, moduleName, root)) { return python; }
    log?.(`${pipName} kuruluyor...`);
    await installPackages(root, [pipName], log);
    return python;
}

const MISSING_IMPORTS_SCRIPT = [
    'import importlib.util, sys',
    'missing = []',
    'for name in sys.argv[1:]:',
    '    try:',
    '        if importlib.util.find_spec(name) is None:',
    '            missing.append(name)',
    '    except Exception:',
    '        missing.append(name)',
    'print("\\n".join(missing))'
].join('\n');

export async function missingImports(root: string, imports: string[]): Promise<string[]> {
    const candidates = [...new Set(imports)].filter(name => /^[A-Za-z_][\w]*$/.test(name));
    if (candidates.length === 0) { return []; }
    try {
        const result = await run(venvPython(root), ['-c', MISSING_IMPORTS_SCRIPT, ...candidates], root, 60000);
        return result.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
    } catch (error) {
        throw new Error(`Import kontrolü başarısız: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function quoteTerminalArg(arg: string): string {
    if (!/[^A-Za-z0-9_./:\\-]/.test(arg)) { return arg; }
    return process.platform === 'win32'
        ? `"${arg.replace(/"/g, '""')}"`
        : `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function launchSpec(root: string, framework: Framework, file: string, python?: string): string {
    const interpreter = python || venvPython(root);
    const moduleName = path.basename(file, '.py');
    const args: string[] = [];
    if (framework === 'django' && file === 'manage.py') { args.push('manage.py', 'runserver'); }
    else if (framework === 'fastapi') { args.push('-m', 'uvicorn', `${moduleName}:app`, '--reload'); }
    else if (framework === 'flask') { args.push('-m', 'flask', '--app', moduleName, 'run'); }
    else if (framework === 'streamlit') { args.push('-m', 'streamlit', 'run', file); }
    else { args.push(file); }
    return [interpreter, ...args].map(quoteTerminalArg).join(' ');
}

const GITIGNORE_ENTRIES = ['.venv/', 'venv/', '__pycache__/', '.pytest_cache/', '.mypy_cache/', '.ruff_cache/', '.env'];

export function ensureGitignore(root: string, log?: (message: string) => void): void {
    const file = path.join(root, '.gitignore');
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const lines = current.split(/\r?\n/);
    const add = GITIGNORE_ENTRIES.filter(entry => !lines.includes(entry));
    if (add.length === 0) { return; }
    fs.writeFileSync(file, `${current.trimEnd()}${current.trimEnd() ? '\n' : ''}${add.join('\n')}\n`);
    log?.(`.gitignore güncellendi: ${add.join(', ')}`);
}
