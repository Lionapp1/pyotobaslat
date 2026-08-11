import * as fs from 'fs';
import * as path from 'path';

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
    missingLikelyPackages: string[];
    findings: DoctorFinding[];
}

// Import adı ile PyPI paket adı aynı olmak zorunda değildir.
// Sadece burada açıkça eşleştirdiğimiz dış paketleri otomatik kuruyoruz;
// böylece proje içindeki modüller yanlışlıkla PyPI'dan kurulmaz.
const IMPORT_TO_PACKAGE: Record<string, string> = {
    cv2: 'opencv-python', PIL: 'Pillow', sklearn: 'scikit-learn', yaml: 'PyYAML',
    dotenv: 'python-dotenv', bs4: 'beautifulsoup4', rest_framework: 'djangorestframework',
    django_filters: 'django-filter', flask_cors: 'flask-cors', flask_sqlalchemy: 'flask-sqlalchemy',
    jwt: 'PyJWT', jose: 'python-jose', serial: 'pyserial', fitz: 'PyMuPDF', docx: 'python-docx',
    psycopg2: 'psycopg2-binary', PILLOW: 'Pillow', requests: 'requests', httpx: 'httpx',
    aiohttp: 'aiohttp', sqlalchemy: 'SQLAlchemy', pymongo: 'pymongo', redis: 'redis',
    openai: 'openai', anthropic: 'anthropic', transformers: 'transformers', torch: 'torch',
    pandas: 'pandas', numpy: 'numpy', matplotlib: 'matplotlib', plotly: 'plotly',
    pytest: 'pytest', rich: 'rich', psutil: 'psutil',
    PySide6: 'PySide6', PyQt6: 'PyQt6', PyQt5: 'PyQt5', cv: 'opencv-python',
    PILImage: 'Pillow', lxml: 'lxml', magic: 'python-magic', bcrypt: 'bcrypt',
    cryptography: 'cryptography', yaml: 'PyYAML', jinja2: 'Jinja2', werkzeug: 'Werkzeug',
    uvicorn: 'uvicorn', gunicorn: 'gunicorn', fastapi: 'fastapi', flask: 'Flask', django: 'Django',
    streamlit: 'streamlit', celery: 'celery', websockets: 'websockets', pydantic: 'pydantic'
};

const STDLIB = new Set([
    'abc','argparse','asyncio','base64','collections','concurrent','contextlib','copy','csv','dataclasses',
    'datetime','decimal','enum','functools','glob','hashlib','http','importlib','inspect','io','itertools',
    'json','logging','math','multiprocessing','os','pathlib','pickle','platform','random','re','secrets',
    'shlex','shutil','signal','socket','sqlite3','statistics','string','subprocess','sys','tempfile','textwrap',
    'threading','time','traceback','typing','unittest','urllib','uuid','warnings','weakref','xml','zipfile'
]);

function readText(file: string): string {
    try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function collectPythonFiles(root: string, maxFiles = 400): string[] {
    const result: string[] = [];
    const ignored = new Set(['.git', '.venv', 'venv', '__pycache__', 'node_modules', '.tox', '.mypy_cache', '.ruff_cache']);
    const walk = (dir: string) => {
        if (result.length >= maxFiles) return;
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
            if (result.length >= maxFiles) break;
            if (ignored.has(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile() && entry.name.endsWith('.py')) result.push(full);
        }
    };
    walk(root);
    return result;
}

function detectImports(files: string[]): string[] {
    const imports = new Set<string>();
    const rx = /^\s*(?:from\s+([A-Za-z_][\w.]*)\s+import|import\s+([A-Za-z_][\w.]*))/gm;
    for (const file of files) {
        const text = readText(file);
        let match: RegExpExecArray | null;
        while ((match = rx.exec(text))) imports.add((match[1] || match[2]).split('.')[0]);
    }
    return [...imports].sort();
}

function declaredPackages(root: string): Set<string> {
    const names = new Set<string>();
    const requirements = path.join(root, 'requirements.txt');
    if (fs.existsSync(requirements)) {
        for (const line of readText(requirements).split(/\r?\n/)) {
            const value = line.trim().replace(/^[-\s]*/, '');
            if (!value || value.startsWith('#') || value.startsWith('-')) continue;
            const name = value.split(/[<>=!~;]/)[0].trim().toLowerCase();
            if (name) names.add(name.replace(/_/g, '-'));
        }
    }
    const pyproject = path.join(root, 'pyproject.toml');
    if (fs.existsSync(pyproject)) {
        const text = readText(pyproject);
        for (const match of text.matchAll(/['\"]([A-Za-z0-9_.-]+)(?:\s*[<>=!~]|['\"])/g)) {
            names.add(match[1].toLowerCase().replace(/_/g, '-'));
        }
    }
    return names;
}

function envKeys(root: string): string[] {
    const keys = new Set<string>();
    const files = collectPythonFiles(root, 250);
    const rx = /(?:os\.environ\.get|os\.getenv)\(\s*['\"]([A-Z][A-Z0-9_]+)['\"]/g;
    for (const file of files) {
        const text = readText(file);
        let match: RegExpExecArray | null;
        while ((match = rx.exec(text))) keys.add(match[1]);
    }
    return [...keys].sort();
}

export function detectFramework(root: string): Framework {
    if (fs.existsSync(path.join(root, 'manage.py'))) return 'django';
    const files = collectPythonFiles(root, 80);
    const text = files.map(readText).join('\n');
    if (/from\s+fastapi\s+import|FastAPI\s*\(/.test(text)) return 'fastapi';
    if (/from\s+flask\s+import|Flask\s*\(/.test(text)) return 'flask';
    if (/import\s+streamlit|from\s+streamlit/.test(text)) return 'streamlit';
    return 'generic';
}

export function analyzeProject(root: string): ProjectReport {
    const files = collectPythonFiles(root);
    const imports = detectImports(files);
    const declared = declaredPackages(root);
    const mapped = imports
        .filter(name => !STDLIB.has(name) && IMPORT_TO_PACKAGE[name])
        .map(name => IMPORT_TO_PACKAGE[name]);
    // Bu alan, manifestte bulunmayan muhtemel paketleri gösterir. Gerçek kurulu
    // durum prepare() içinde venv Python'u ile importlib üzerinden doğrulanır.
    const missing = [...new Set(mapped)].filter(pkg => !declared.has(pkg.toLowerCase().replace(/_/g, '-')));
    const framework = detectFramework(root);
    const hasVenv = fs.existsSync(path.join(root, '.venv')) || fs.existsSync(path.join(root, 'venv'));
    const hasRequirements = fs.existsSync(path.join(root, 'requirements.txt'));
    const hasPyproject = fs.existsSync(path.join(root, 'pyproject.toml'));
    const hasGitignore = fs.existsSync(path.join(root, '.gitignore'));
    const keys = envKeys(root);
    const findings: DoctorFinding[] = [];

    if (!hasVenv) findings.push({ severity: 'warning', title: 'Sanal ortam bulunamadı', detail: '.venv veya venv klasörü yok.', fix: 'python -m venv .venv' });
    if (!hasRequirements && !hasPyproject) findings.push({ severity: 'warning', title: 'Bağımlılık manifestosu yok', detail: 'requirements.txt veya pyproject.toml bulunamadı.', fix: 'Bağımlılıkları requirements.txt veya pyproject.toml ile sabitleyin.' });
    if (!hasGitignore) findings.push({ severity: 'warning', title: '.gitignore eksik', detail: 'Sanal ortam ve gizli dosyalar yanlışlıkla commit edilebilir.', fix: '.venv, __pycache__ ve .env ekleyin.' });
    if (fs.existsSync(path.join(root, '.env')) && !hasGitignore) findings.push({ severity: 'error', title: '.env Git riski', detail: '.env mevcut ve .gitignore yok.', fix: '.env dosyasını hemen .gitignore içine alın.' });
    if (missing.length) findings.push({ severity: 'warning', title: 'Muhtemel eksik bağımlılıklar', detail: missing.join(', '), fix: 'PyOtoBaşlat bunları sanal ortamda import testi ile doğrulayıp gerekirse otomatik kurar.' });
    if (keys.length) findings.push({ severity: 'info', title: 'Ortam değişkenleri tespit edildi', detail: `${keys.length} anahtar bulundu: ${keys.join(', ')}` });
    if (framework !== 'generic') findings.push({ severity: 'info', title: 'Framework algılandı', detail: framework.toUpperCase() });
    if (!files.length) findings.push({ severity: 'error', title: 'Python dosyası bulunamadı', detail: 'Açılan klasörde Python kaynak kodu bulunamadı.' });

    return { root, pythonFiles: files.length, framework, hasVenv, hasRequirements, hasPyproject, hasGitignore, envKeys: keys, imports, missingLikelyPackages: missing, findings };
}

export function formatReport(report: ProjectReport): string {
    const icon = (severity: FindingSeverity) => severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    const lines = [
        '# 🐍 PyOtoBaşlat Project Doctor', '',
        `**Proje:** ${report.root}`,
        `**Framework:** ${report.framework}`,
        `**Python dosyası:** ${report.pythonFiles}`,
        `**Sanal ortam:** ${report.hasVenv ? '✅' : '❌'}`,
        `**Bağımlılık dosyası:** ${report.hasRequirements || report.hasPyproject ? '✅' : '❌'}`,
        `**.gitignore:** ${report.hasGitignore ? '✅' : '❌'}`, '',
        '## Bulgular', ''
    ];
    if (!report.findings.length) lines.push('✅ Kritik veya uyarı niteliğinde bulgu yok.');
    for (const finding of report.findings) {
        lines.push(`${icon(finding.severity)} **${finding.title}** — ${finding.detail}`);
        if (finding.fix) lines.push(`   - Öneri: ${finding.fix}`);
    }
    return lines.join('\n');
}
