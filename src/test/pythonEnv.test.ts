import test from 'node:test';
import assert from 'node:assert/strict';

function loadEnvWithMock(): any {
    const Module = require('module');
    const originalLoad = Module._load;
    const vscodeMock: any = {
        workspace: { getConfiguration: () => ({ get: () => '' }) }
    };
    Module._load = function (request: string, parent: unknown, isMain: boolean): unknown {
        if (request === 'vscode') { return vscodeMock; }
        return originalLoad.call(this, request, parent, isMain);
    };
    try { return require('../pythonEnv'); }
    finally { Module._load = originalLoad; }
}

test('launchSpec frameworka göre doğru modül ve dosyayı kullanır', () => {
    const env = loadEnvWithMock();
    const python = process.platform === 'win32' ? 'python.exe' : '/usr/bin/python3';
    const quoted = env.quoteTerminalArg(python);

    assert.equal(
        env.launchSpec('/proje', 'fastapi', 'main.py', python),
        `${quoted} -m uvicorn main:app --reload`
    );
    assert.equal(
        env.launchSpec('/proje', 'fastapi', 'api.py', python),
        `${quoted} -m uvicorn api:app --reload`
    );
    assert.equal(
        env.launchSpec('/proje', 'flask', 'app.py', python),
        `${quoted} -m flask --app app run`
    );
    assert.equal(
        env.launchSpec('/proje', 'django', 'manage.py', python),
        `${quoted} manage.py runserver`
    );
    assert.equal(
        env.launchSpec('/proje', 'streamlit', 'dashboard.py', python),
        `${quoted} -m streamlit run dashboard.py`
    );
    assert.equal(
        env.launchSpec('/proje', 'script', 'main.py', python),
        `${quoted} main.py`
    );
});

test('quoteTerminalArg boşluklu yolları platforma uygun kaçılar', () => {
    const env = loadEnvWithMock();
    const value = process.platform === 'win32'
        ? 'C:\\My Projects\\app.py'
        : '/root/My Projects/app.py';
    const quoted = env.quoteTerminalArg(value);
    assert.ok(quoted.includes(value));
    assert.ok(quoted.startsWith(process.platform === 'win32' ? '"' : "'"));
    assert.equal(env.quoteTerminalArg('main.py'), 'main.py');
});

test('installPackages şüpheli paket adlarını reddeder', async () => {
    const env = loadEnvWithMock();
    await assert.rejects(
        () => env.installPackages('/proje', ['--index-url', 'http://evil']),
        /Geçersiz paket adı/
    );
});
