import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { AstProjectInfo, Framework } from './projectDoctor';
import { safePackageName, STDLIB_MODULES } from './packageMap';

export function run(command: string, args: string[], cwd: string, timeout = 300000): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(command, args, { cwd, timeout, maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
            const output = `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.trim();
            if (error) { reject(new Error(output || error.message)); } else { resolve(output); }
        });
    });
}

// Gerçek Python AST'si üzerinden import / ortam değişkeni / framework analizi.
// Kaynak koddaki yorumlar ve multiline string'ler yanlış pozitif üretmez.
const INSPECT_SCRIPT = [
    'import ast, json, os, sys',
    'root = sys.argv[1]',
    'ignore = {".git", ".venv", "venv", "env", "ENV", "__pycache__", "node_modules", ".tox", ".nox", ".mypy_cache", ".ruff_cache", ".pytest_cache", "build", "dist"}',
    'imports = set()',
    'env_keys = set()',
    'framework = "django" if os.path.exists(os.path.join(root, "manage.py")) else "generic"',
    'app_name = None',
    'def text(node):',
    '    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None',
    'def call_name(node):',
    '    if not isinstance(node, ast.Call):',
    '        return ""',
    '    func = node.func',
    '    if isinstance(func, ast.Name):',
    '        return func.id',
    '    return func.attr if isinstance(func, ast.Attribute) else ""',
    'files = 0',
    'for dirpath, dirnames, filenames in os.walk(root):',
    '    dirnames[:] = [d for d in dirnames if d not in ignore]',
    '    for filename in filenames:',
    '        if not filename.endswith(".py") or files >= 400:',
    '            continue',
    '        files += 1',
    '        full = os.path.join(dirpath, filename)',
    '        try:',
    '            with open(full, encoding="utf-8", errors="replace") as handle:',
    '                tree = ast.parse(handle.read(), filename=full)',
    '        except Exception:',
    '            continue',
    '        for node in ast.walk(tree):',
    '            if isinstance(node, ast.Import):',
    '                for alias in node.names:',
    '                    imports.add(alias.name.split(".")[0])',
    '            elif isinstance(node, ast.ImportFrom):',
    '                if node.level == 0 and node.module:',
    '                    top = node.module.split(".")[0]',
    '                    imports.add(top)',
    '                    if framework == "generic" and top == "fastapi":',
    '                        framework = "fastapi"',
    '                    elif framework == "generic" and top == "flask":',
    '                        framework = "flask"',
    '                    elif framework == "generic" and top == "streamlit":',
    '                        framework = "streamlit"',
    '            elif isinstance(node, ast.Assign) and call_name(node.value) in ("FastAPI", "Flask"):',
    '                name = call_name(node.value)',
    '                if framework == "generic":',
    '                    framework = "fastapi" if name == "FastAPI" else "flask"',
    '                if app_name is None:',
    '                    for target in node.targets:',
    '                        if isinstance(target, ast.Name):',
    '                            app_name = target.id',
    '                            break',
    '            elif isinstance(node, ast.Call):',
    '                name = call_name(node)',
    '                if framework == "generic" and name == "FastAPI":',
    '                    framework = "fastapi"',
    '                elif framework == "generic" and name == "Flask":',
    '                    framework = "flask"',
    '                func = node.func',
    '                key = None',
    '                if isinstance(func, ast.Attribute):',
    '                    owner = func.value',
    '                    if func.attr == "getenv" and isinstance(owner, ast.Name) and owner.id == "os" and node.args:',
    '                        key = text(node.args[0])',
    '                    elif func.attr == "get" and isinstance(owner, ast.Attribute) and owner.attr == "environ" and isinstance(owner.value, ast.Name) and owner.value.id == "os" and node.args:',
    '                        key = text(node.args[0])',
    '                if key and key.isupper():',
    '                    env_keys.add(key)',
    '            elif isinstance(node, ast.Subscript):',
    '                value = node.value',
    '                if isinstance(value, ast.Attribute) and value.attr == "environ" and isinstance(value.value, ast.Name) and value.value.id == "os":',
    '                    slice_node = node.slice.value if isinstance(node.slice, ast.Index) else node.slice',
    '                    key = text(slice_node)',
    '                    if key and key.isupper():',
    '                        env_keys.add(key)',
    'print(json.dumps({"imports": sorted(imports), "envKeys": sorted(env_keys), "framework": framework, "appName": app_name}))'
].join('\n');

export async function inspectProjectWithPython(root: string, python: string): Promise<AstProjectInfo> {
    const raw = await run(python, ['-c', INSPECT_SCRIPT, root], root, 60000);
    const line = raw.trim().split(/\r?\n/).pop() || '{}';
    const data = JSON.parse(line) as {
        imports?: string[]; envKeys?: string[]; framework?: Framework; appName?: string | null;
    };
    return {
        imports: (data.imports || []).filter(name => !STDLIB_MODULES.has(name)).sort(),
        envKeys: data.envKeys || [],
        framework: data.framework || 'generic',
        appName: data.appName || undefined
    };
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

export function launchSpec(
    root: string,
    framework: Framework,
    file: string,
    python?: string,
    appName?: string
): string {
    const interpreter = python || venvPython(root);
    const moduleName = path.basename(file, '.py');
    const args: string[] = [];
    if (framework === 'django' && file === 'manage.py') { args.push('manage.py', 'runserver'); }
    else if (framework === 'fastapi') { args.push('-m', 'uvicorn', `${moduleName}:${appName || 'app'}`, '--reload'); }
    else if (framework === 'flask') {
        const target = appName && appName !== 'app' ? `${moduleName}:${appName}` : moduleName;
        args.push('-m', 'flask', '--app', target, 'run');
    }
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
