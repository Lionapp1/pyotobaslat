import test from 'node:test';
import assert from 'node:assert/strict';

test('activate tüm komutları kaydeder', t => {
    const Module = require('module');
    const originalLoad = Module._load;
    const registered = new Map<string, unknown>();

    const vscodeMock: any = {
        workspace: {
            workspaceFolders: undefined,
            getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback, update: async () => undefined }),
            onDidChangeWorkspaceFolders: () => ({ dispose() { /* noop */ } }),
            onDidSaveTextDocument: () => ({ dispose() { /* noop */ } }),
            openTextDocument: async () => ({}),
            findFiles: async () => []
        },
        window: {
            terminals: [],
            createOutputChannel: () => ({ appendLine() { /* noop */ }, show() { /* noop */ }, dispose() { /* noop */ } }),
            createStatusBarItem: () => ({ show() { /* noop */ }, dispose() { /* noop */ }, text: '', tooltip: '', command: '' }),
            createTerminal: () => ({ sendText() { /* noop */ }, show() { /* noop */ } }),
            showErrorMessage: async () => undefined,
            showWarningMessage: async () => undefined,
            showInformationMessage: async () => undefined,
            createWebviewPanel: () => ({ webview: { html: '' } }),
            showTextDocument: async () => ({})
        },
        commands: {
            registerCommand: (id: string, handler: unknown) => {
                registered.set(id, handler);
                return { dispose() { /* noop */ } };
            },
            executeCommand: async () => undefined
        },
        StatusBarAlignment: { Left: 1 },
        ConfigurationTarget: { Workspace: 2 },
        ProgressLocation: { Notification: 15 },
        ViewColumn: { One: 1 },
        env: { openExternal: async () => true },
        Uri: { parse: (value: string) => value }
    };

    Module._load = function (request: string, parent: unknown, isMain: boolean): unknown {
        if (request === 'vscode') { return vscodeMock; }
        return originalLoad.call(this, request, parent, isMain);
    };
    t.after(() => { Module._load = originalLoad; });

    const extension = require('../projectDoctorExtension');
    const context: any = {
        subscriptions: [],
        globalState: { get: (_key: string, fallback: unknown) => fallback, update: async () => undefined }
    };
    extension.activate(context);

    const expected = [
        'pyotobaslat.hazirlaVeCalistir',
        'pyotobaslat.koduDuzelt',
        'pyotobaslat.projeSaglikKontrolu',
        'pyotobaslat.hataIstatistikleri',
        'pyotobaslat.ortamiSaglikRaporu',
        'pyotobaslat.paketleriGuncelle',
        'pyotobaslat.guvenlikTaramasi',
        'pyotobaslat.testleriCalistir',
        'pyotobaslat.kodKalitesi',
        'pyotobaslat.performansAnalizi',
        'pyotobaslat.ortamiTemizle',
        'pyotobaslat.ayarlarAc'
    ];
    assert.equal(registered.size, expected.length);
    for (const id of expected) { assert.ok(registered.has(id), `${id} kaydedilmedi`); }
    assert.equal(context.subscriptions.length, expected.length + 4); // output, status ve iki olay dinleyicisi
});
