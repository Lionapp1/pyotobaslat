import * as fs from 'fs';
import * as path from 'path';
import { IMPORT_TO_PACKAGE, normalizePackageName, STDLIB_MODULES } from './packageMap';

export type Framework = 'django' | 'flask' | 'fastapi' | 'streamlit' | 'generic';
export type FindingSeverity = 'error' | 'warning' | 'info';

export interface DoctorFinding {
    severity: FindingSeverity;
    title: string;
    detail: string;
    fix?: string;
}

export interface ProjectReport {
    root: string;
    pythonFiles: number;
    framework: Framework;
    hasVenv: boolean;
    hasRequirements: boolean;
    hasPyproject: boolean;
    hasGitignore: boolean;
    envKeys: string[];
    imports: string[];
    declaredPackages: string[];
    missingLikelyPackages: string[];
    findings: DoctorFinding[];
}

const IGNORED_DIRS = new Set([
    '.git', '.venv', 'venv', 'env', 'ENV', '__pycache__', 'node_modules',
    '.tox', '.nox', '.mypy_cache', '.ruff_cache', '.pytest_cache', 'build', 'dist'
]);

function readText(file: string): string {
    try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

export function collectPythonFiles(root: string, maxFiles = 400): string[] {
    const result: string[] = [];
    const walk = (dir: string): void => {
        if (result.length >= maxFiles) { return; }
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
            if (result.length >= maxFiles) { return; }
            if (entry.isDirectory()) {
                if (!IGNORED_DIRS.has(entry.name)) { walk(path.join(dir, entry.name)); }
                continue;
            }
            if (entry.isFile() && entry.name.endsWith('.py')) { result.push(path.join(dir, entry.name)); }
        }
    };
    walk(root);
    return result.sort();
}

export function detectImports(files: string[]): string[] {
    const imports = new Set<string>();
    const fromPattern = /^\s*from\s+([A-Za-z_][\w.]*)\s+import\b/gm;
    const importPattern = /^\s*import\s+([^\n#]+)/gm;
    const add = (name: string): void => {
        const rootName = name.split('.')[0];
        if (!STDLIB_MODULES.has(rootName)) { imports.add(rootName); }
    };
    for (const file of files) {
        const text = readText(file);
        let match: RegExpExecArray | null;
        while ((match = fromPattern.exec(text)) !== null) { add(match[1]); }
        while ((match = importPattern.exec(text)) !== null) {
            for (const part of match[1].split(',')) {
                const name = part.trim().match(/^([A-Za-z_][\w.]*)/)?.[1];
                if (name) { add(name); }
            }
        }
    }
    return [...imports].sort();
}

export function declaredPackages(root: string): Set<string> {
    const names = new Set<string>();
    const requirements = path.join(root, 'requirements.txt');
    for (const line of readText(requirements).split(/\r?\n/)) {
        const value = line.split('#')[0].trim();
        if (!value || value.startsWith('-')) { continue; }
        const name = value.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/)?.[1];
        if (name) { names.add(normalizePackageName(name)); }
    }

    // pyproject.toml: PEP 621 dependencies ve Poetry bağımlılıkları (temel ayrıştırma).
    const pyproject = readText(path.join(root, 'pyproject.toml'));
    const pep621 = pyproject.match(/dependencies\s*=\s*\[([\s\S]*?)\]/)?.[1] || '';
    for (const item of pep621.matchAll(/["']([A-Za-z0-9][A-Za-z0-9._-]*)/g)) {
        names.add(normalizePackageName(item[1]));
    }
    const poetry = pyproject.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?:\n\[|$)/)?.[1] || '';
    for (const line of poetry.split(/\r?\n/)) {
        const name = line.match(/^\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*=/)?.[1];
        if (name && name.toLowerCase() !== 'python') { names.add(normalizePackageName(name)); }
    }
    return names;
}

export function envKeys(root: string): string[] {
    const keys = new Set<string>();
    const pattern = /(?:os\.environ\.get|os\.getenv)\(\s*['"]([A-Z][A-Z0-9_]*)['"]|os\.environ\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\]/g;
    for (const file of collectPythonFiles(root, 250)) {
        const text = readText(file);
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) { keys.add(match[1] || match[2]); }
    }
    return [...keys].sort();
}

export function detectFramework(root: string): Framework {
    if (fs.existsSync(path.join(root, 'manage.py'))) { return 'django'; }
    const text = collectPythonFiles(root, 80).map(readText).join('\n');
    if (/from\s+fastapi\s+import|FastAPI\s*\(/.test(text)) { return 'fastapi'; }
    if (/from\s+flask\s+import|Flask\s*\(/.test(text)) { return 'flask'; }
    if (/import\s+streamlit|from\s+streamlit/.test(text)) { return 'streamlit'; }
    return 'generic';
}

export function analyzeProject(root: string): ProjectReport {
    const files = collectPythonFiles(root);
    const imports = detectImports(files);
    const declared = declaredPackages(root);
    const mapped = imports
        .filter(name => Boolean(IMPORT_TO_PACKAGE[name]))
        .map(name => IMPORT_TO_PACKAGE[name]);
    const missing = [...new Set(mapped)]
        .filter(pkg => !declared.has(normalizePackageName(pkg)))
        .sort();
    const framework = detectFramework(root);
    const hasVenv = fs.existsSync(path.join(root, '.venv')) || fs.existsSync(path.join(root, 'venv'));
    const hasRequirements = fs.existsSync(path.join(root, 'requirements.txt'));
    const hasPyproject = fs.existsSync(path.join(root, 'pyproject.toml'));
    const hasGitignore = fs.existsSync(path.join(root, '.gitignore'));
    const keys = envKeys(root);
    const findings: DoctorFinding[] = [];

    if (files.length === 0) {
        findings.push({ severity: 'warning', title: 'Python dosyası yok', detail: 'Klasörde .py dosyası bulunamadı.', fix: 'Bir Python dosyası ekleyin.' });
    }
    if (!hasVenv) {
        findings.push({ severity: 'warning', title: 'Sanal ortam bulunamadı', detail: '.venv veya venv klasörü yok.', fix: 'python -m venv .venv' });
    }
    if (!hasRequirements && !hasPyproject) {
        findings.push({ severity: 'warning', title: 'Bağımlılık manifestosu yok', detail: 'requirements.txt veya pyproject.toml bulunamadı.', fix: 'Bağımlılıkları sabitleyin.' });
    }
    if (!hasGitignore) {
        findings.push({ severity: 'warning', title: '.gitignore eksik', detail: 'Sanal ortam ve gizli dosyalar yanlışlıkla commit edilebilir.', fix: '.venv, __pycache__ ve .env satırlarını ekleyin.' });
    }
    if (fs.existsSync(path.join(root, '.env')) && !hasGitignore) {
        findings.push({ severity: 'error', title: '.env Git riski', detail: '.env mevcut ancak .gitignore yok.', fix: '.env dosyasını .gitignore içine alın.' });
    }
    if (missing.length > 0) {
        findings.push({ severity: 'warning', title: 'Muhtemel eksik bağımlılıklar', detail: missing.join(', '), fix: 'PyOtoBaşlat import testi yapıp yalnızca bilinen eşleşmeleri kurar.' });
    }
    if (keys.length > 0) {
        findings.push({ severity: 'info', title: 'Ortam değişkenleri tespit edildi', detail: `${keys.length} anahtar: ${keys.join(', ')}` });
    }
    if (framework !== 'generic') {
        findings.push({ severity: 'info', title: 'Framework algılandı', detail: framework });
    }

    return {
        root, pythonFiles: files.length, framework, hasVenv, hasRequirements,
        hasPyproject, hasGitignore, envKeys: keys, imports,
        declaredPackages: [...declared].sort(), missingLikelyPackages: missing, findings
    };
}

export function formatReport(report: ProjectReport): string {
    const icon = (severity: FindingSeverity): string => severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    const lines = [
        '# 🐍 PyOtoBaşlat Project Doctor',
        '',
        `**Proje:** ${report.root}`,
        `**Framework:** ${report.framework}`,
        `**Python dosyası:** ${report.pythonFiles}`,
        `**Sanal ortam:** ${report.hasVenv ? '✅' : '❌'}`,
        `**Bağımlılık dosyası:** ${report.hasRequirements || report.hasPyproject ? '✅' : '❌'}`,
        `**.gitignore:** ${report.hasGitignore ? '✅' : '❌'}`,
        '',
        '## Bulgular',
        ''
    ];
    if (report.findings.length === 0) { lines.push('✅ Kritik veya uyarı niteliğinde bulgu yok.'); }
    for (const finding of report.findings) {
        lines.push(`${icon(finding.severity)} **${finding.title}** — ${finding.detail}`);
        if (finding.fix) { lines.push(`   - Öneri: ${finding.fix}`); }
    }
    return lines.join('\n');
}
