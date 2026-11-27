import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    analyzeProject, collectPythonFiles, declaredPackages, detectFramework,
    detectImports, envKeys
} from '../projectDoctor';
import { normalizePackageName, safePackageName } from '../packageMap';
import { parseProfile, performanceHtml, statisticsHtml } from '../webviews';

function tempProject(t: { after: (fn: () => void) => void }): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyotobaslat-test-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return dir;
}

test('collectPythonFiles atlanan dizinlere rağmen tüm dosyaları bulur', t => {
    const root = tempProject(t);
    fs.writeFileSync(path.join(root, 'a.py'), 'print(1)');
    fs.mkdirSync(path.join(root, '.git'));
    fs.writeFileSync(path.join(root, '.git', 'g.py'), 'print(0)');
    fs.mkdirSync(path.join(root, '__pycache__'));
    fs.writeFileSync(path.join(root, '__pycache__', 'c.py'), 'print(0)');
    fs.mkdirSync(path.join(root, 'sub'));
    fs.writeFileSync(path.join(root, 'sub', 'b.py'), 'print(2)');
    const files = collectPythonFiles(root).map(file => path.relative(root, file));
    assert.deepEqual(files, ['a.py', path.join('sub', 'b.py')]);
});

test('detectImports girintili importları bulur, standart kütüphaneyi ayıklar', t => {
    const root = tempProject(t);
    const file = path.join(root, 'main.py');
    fs.writeFileSync(file, [
        'import os',
        'from pathlib import Path',
        'import requests',
        '    from cv2 import imread',
        'import local_module'
    ].join('\n'));
    const imports = detectImports([file]);
    assert.ok(imports.includes('requests'));
    assert.ok(imports.includes('cv2'));
    assert.ok(imports.includes('local_module'));
    assert.ok(!imports.includes('os'));
    assert.ok(!imports.includes('pathlib'));
});

test('declaredPackages requirements ve pyproject satırlarını normalize eder', t => {
    const root = tempProject(t);
    fs.writeFileSync(path.join(root, 'requirements.txt'), [
        '# yorum',
        '-r common.txt',
        'requests>=2.28',
        'PyYAML[safe] == 6.0  # satır sonu yorumu',
        'python_dotenv~=1.0'
    ].join('\n'));
    fs.writeFileSync(path.join(root, 'pyproject.toml'), [
        '[project]',
        'dependencies = ["fastapi>=0.100", "uvicorn"]',
        '',
        '[tool.poetry.dependencies]',
        'python = "^3.11"',
        'rich = "^13"'
    ].join('\n'));
    const declared = declaredPackages(root);
    assert.ok(declared.has('requests'));
    assert.ok(declared.has('pyyaml'));
    assert.ok(declared.has('python-dotenv'));
    assert.ok(declared.has('fastapi'));
    assert.ok(declared.has('uvicorn'));
    assert.ok(declared.has('rich'));
    assert.ok(!declared.has('python'));
    assert.ok(!declared.has('common.txt'));
});

test('analyzeProject eksik paketleri ve framework raporlar', t => {
    const root = tempProject(t);
    fs.writeFileSync(path.join(root, 'requirements.txt'), 'requests==2.31.0\nfastapi>=0.100\n');
    fs.writeFileSync(path.join(root, 'main.py'), [
        'import requests',
        'import cv2',
        'from fastapi import FastAPI',
        'app = FastAPI()'
    ].join('\n'));
    const report = analyzeProject(root);
    assert.equal(report.framework, 'fastapi');
    assert.deepEqual(report.missingLikelyPackages, ['opencv-python']);
    assert.ok(report.findings.some(finding => finding.title === 'Muhtemel eksik bağımlılıklar'));
});

test('envKeys os.getenv, environ.get ve environ[...] kullanımlarını bulur', t => {
    const root = tempProject(t);
    fs.writeFileSync(path.join(root, 'main.py'), [
        'import os',
        'os.getenv("API_KEY")',
        'os.environ.get("DEBUG", "0")',
        'os.environ["DATABASE_URL"]'
    ].join('\n'));
    assert.deepEqual(envKeys(root), ['API_KEY', 'DATABASE_URL', 'DEBUG']);
});

test('detectFramework manage.py ve kaynak koda göre çalışır', t => {
    const root = tempProject(t);
    assert.equal(detectFramework(root), 'generic');
    fs.writeFileSync(path.join(root, 'manage.py'), '');
    assert.equal(detectFramework(root), 'django');
    fs.rmSync(path.join(root, 'manage.py'));
    fs.writeFileSync(path.join(root, 'app.py'), 'from flask import Flask');
    assert.equal(detectFramework(root), 'flask');
});

test('paket adı yardımcıları güvenli ve tutarlı', () => {
    assert.equal(normalizePackageName('PyYAML[safe]'), 'pyyaml[safe]');
    assert.equal(normalizePackageName('python_dotenv'), 'python-dotenv');
    assert.equal(safePackageName('opencv-python'), true);
    assert.equal(safePackageName('--index-url'), false);
    assert.equal(safePackageName('pkg; rm -rf /'), false);
});

test('cProfile çıktısı ayrıştırılır ve webview HTML kaçışı yapılır', () => {
    const profile = [
        '   ncalls  tottime  percall  cumtime  percall filename:lineno(function)',
        '        1    0.100    0.100    0.300    0.300 main.py:1(<module>)',
        '     10/2    0.050    0.005    0.200    0.100 </tmp/<script>.py:2(run)'
    ].join('\n');
    const rows = parseProfile(profile);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].ncalls, '1');
    assert.equal(rows[1].filename, '</tmp/<script>.py:2(run)');
    const html = performanceHtml(profile);
    assert.ok(!html.includes('</script>.py'));
    assert.ok(html.includes('\\u003cscript\\u003e.py'));
});

test('istatistik HTML kullanıcı verisini kaçılar', () => {
    const html = statisticsHtml([{
        errorType: '<img src=x onerror=alert(1)>',
        count: 2,
        lastDate: 'bugün',
        project: 'proje'
    }]);
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('&lt;img src=x'));
});
