import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ==================== HATA SÖZLÜĞÜ VE ÇÖZÜM ÖNERİLERİ ====================
interface HataCozum {
    aciklama: string;
    cozum: string;
    komut?: string;
}

const HATA_SOZLUGU: Record<string, HataCozum> = {
    "ModuleNotFoundError": {
        aciklama: "📦 Eksik Paket: Bu modül yüklü değil.",
        cozum: "Paketi otomatik kurayım mı?",
        komut: "pip install {paket}"
    },
    "ImportError": {
        aciklama: "📥 İçe Aktarma Hatası: Modül bulunamadı veya bozuk.",
        cozum: "Sanal ortamı kontrol edin veya paketi yeniden kurun.",
        komut: "pip install --force-reinstall {paket}"
    },
    "SyntaxError": {
        aciklama: "✍️ Söz Dizimi Hatası: Kodda yazım yanlışı var.",
        cozum: "Satır numarasını kontrol edin ve düzeltin."
    },
    "IndentationError": {
        aciklama: "↔️ Girinti Hatası: Python'da girintiler çok önemlidir.",
        cozum: "Hizalamayı düzeltin (boşluk/tab karışıklığı olabilir)."
    },
    "NameError": {
        aciklama: "🏷️ Tanımsız İsim: Değişken/fonksiyon tanımlanmamış.",
        cozum: "Değişkeni tanımlamadan önce kullandınız mı kontrol edin."
    },
    "TypeError": {
        aciklama: "🔄 Tür Hatası: Yanlış veri türüyle işlem yapıyorsunuz.",
        cozum: "Veri türlerini kontrol edin (örn: string + int olmaz)."
    },
    "ValueError": {
        aciklama: "⚠️ Değer Hatası: Geçersiz bir değer kullanıldı.",
        cozum: "Fonksiyona doğru tipte değer verdiğinizi kontrol edin."
    },
    "FileNotFoundError": {
        aciklama: "📁 Dosya Bulunamadı: Belirttiğiniz dosya mevcut değil.",
        cozum: "Dosya yolunu kontrol edin veya dosyayı oluşturun."
    },
    "ZeroDivisionError": {
        aciklama: "➗ Sıfıra Bölme: Bir sayıyı sıfıra bölmeye çalıştınız.",
        cozum: "Bölen değerin sıfır olmadığını kontrol edin."
    },
    "AttributeError": {
        aciklama: "🔧 Nitelik Hatası: Bu nesnenin böyle bir özelliği yok.",
        cozum: "Nesne türünü ve metodlarını kontrol edin."
    },
    "IndexError": {
        aciklama: "📋 Liste İndeksi Hatası: Listenin olmayan elemanına erişim.",
        cozum: "Liste uzunluğunu kontrol edin (len(liste))."
    },
    "KeyError": {
        aciklama: "🔑 Anahtar Hatası: Sözlükte bu anahtar yok.",
        cozum: "Anahtarın sözlükte var olduğunu kontrol edin."
    },
    "PermissionError": {
        aciklama: "🔒 İzin Hatası: Bu dosyaya erişim izniniz yok.",
        cozum: "Dosya izinlerini kontrol edin veya yönetici olarak çalıştırın."
    },
    "ConnectionError": {
        aciklama: "🌐 Bağlantı Hatası: Ağ veya veritabanı bağlantısı kurulamadı.",
        cozum: "İnternet bağlantınızı ve URL'yi kontrol edin."
    },
    "Address already in use": {
        aciklama: "🚪 Port Meşgul: Bu port başka bir program tarafından kullanılıyor.",
        cozum: "Farklı bir portta başlatayım mı?",
        komut: "port_degistir"
    },
    "RecursionError": {
        aciklama: "🔁 Özyineleme Hatası: Maksimum özyineleme derinliği aşıldı.",
        cozum: "Fonksiyonun kendini sonsuz çağırdığını kontrol edin. Taban durumu (base case) eksik olabilir."
    },
    "MemoryError": {
        aciklama: "💾 Bellek Hatası: Sistem belleği yetersiz.",
        cozum: "Büyük veri setlerini parçalı okuyun veya RAM kullanımını optimize edin."
    },
    "UnicodeDecodeError": {
        aciklama: "🔤 Karakter Kodlama Hatası: Dosya karakter seti uyuşmazlığı.",
        cozum: "Dosyayı utf-8 ile açmayı deneyin: open('dosya', encoding='utf-8')"
    },
    "TimeoutError": {
        aciklama: "⏱️ Zaman Aşımı: İşlem beklenen sürede tamamlanmadı.",
        cozum: "API/DB bağlantısını veya döngü mantığını kontrol edin."
    }
};

function turkceHataCozum(hataMesaji: string): { hataTur: string; cozum: HataCozum } | null {
    for (const [hataTur, cozum] of Object.entries(HATA_SOZLUGU)) {
        if (hataMesaji.includes(hataTur)) {
            return { hataTur, cozum };
        }
    }
    return null;
}

// ==================== YARDIMCI FONKSİYONLAR ====================
function runCommand(cmd: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) reject(new Error(stderr || error.message));
            else resolve(stdout);
        });
    });
}

function dosyaIcerikKontrol(dizin: string, dosyaAdi: string, aranacakKelime: string): boolean {
    try {
        const icerik = fs.readFileSync(path.join(dizin, dosyaAdi), 'utf-8');
        return icerik.includes(aranacakKelime);
    } catch {
        return false;
    }
}

async function importEdilenPaketleriBul(rootPath: string): Promise<string[]> {
    const paketler = new Set<string>();
    const standartKutuphane = new Set([
        'os', 'sys', 'json', 'math', 'datetime', 'time', 'random', 're',
        'collections', 'itertools', 'functools', 'pathlib', 'typing',
        'unittest', 'logging', 'argparse', 'csv', 'sqlite3', 'threading',
        'multiprocessing', 'subprocess', 'shutil', 'glob', 'hashlib',
        'abc', 'io', 'string', 'decimal', 'fractions', 'copy', 'pprint',
        'textwrap', 'struct', 'codecs', 'unicodedata', 'locale', 'gettext'
    ]);

    try {
        const files = await vscode.workspace.findFiles(
            '**/*.py',
            '**/{.venv,node_modules,__pycache__,.git,build,dist}/**'
        );
        const okumaPromises = files.map(async (file) => {
            try {
                const content = await fs.promises.readFile(file.fsPath, 'utf-8');
                const importSatirlari = content.match(/^(?:import|from)\s+(\w+)/gm) || [];
                for (const satir of importSatirlari) {
                    const paket = satir.replace(/^(?:import|from)\s+/, '').split('.')[0];
                    if (!standartKutuphane.has(paket)) {
                        paketler.add(paket);
                    }
                }
            } catch {}
        });
        await Promise.all(okumaPromises);
    } catch {
        try {
            const dosyalar = fs.readdirSync(rootPath).filter(f => f.endsWith('.py'));
            for (const dosya of dosyalar) {
                const icerik = fs.readFileSync(path.join(rootPath, dosya), 'utf-8');
                const importSatirlari = icerik.match(/^(?:import|from)\s+(\w+)/gm) || [];
                for (const satir of importSatirlari) {
                    const paket = satir.replace(/^(?:import|from)\s+/, '').split('.')[0];
                    if (!standartKutuphane.has(paket)) {
                        paketler.add(paket);
                    }
                }
            }
        } catch {}
    }
    return Array.from(paketler);
}

async function eksikPaketleriKontrolEt(rootPath: string, pipCmd: string): Promise<string[]> {
    const importEdilen = await importEdilenPaketleriBul(rootPath);
    const eksikler: string[] = [];
    const chunks = [];
    for (let i = 0; i < importEdilen.length; i += 5) {
        chunks.push(importEdilen.slice(i, i + 5));
    }
    for (const chunk of chunks) {
        const results = await Promise.allSettled(
            chunk.map(paket => runCommand(`${pipCmd} show ${paket}`, rootPath))
        );
        results.forEach((result, idx) => {
            if (result.status === 'rejected') {
                eksikler.push(chunk[idx]);
            }
        });
    }
    return eksikler;
}

function getOrCreateTerminal(name: string): vscode.Terminal {
    let terminal = vscode.window.terminals.find(t => t.name === name);
    if (!terminal) {
        terminal = vscode.window.createTerminal(name);
    }
    return terminal;
}

function gitignoreOlustur(rootPath: string) {
    const gitignorePath = path.join(rootPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) return;
    const template = `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
.venv/
venv/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db
`;
    fs.writeFileSync(gitignorePath, template);
}

// 🆕 v1.3.2: .env değişkenlerini tara
async function envDegiskenleriniTara(rootPath: string): Promise<string[]> {
    const degiskenler = new Set<string>();
    try {
        const files = await vscode.workspace.findFiles(
            '**/*.py',
            '**/{.venv,node_modules,__pycache__,.git}/**'
        );
        for (const file of files) {
            try {
                const content = await fs.promises.readFile(file.fsPath, 'utf-8');
                // os.getenv(), os.environ[], dotenv, config() kalıplarını tara
                const patterns = [
                    /os\.getenv\(['"](\w+)['"]/g,
                    /os\.environ\[?['"](\w+)['"]\]?/g,
                    /config\(['"](\w+)['"]\)/g,
                    /environ\.get\(['"](\w+)['"]/g
                ];
                for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        degiskenler.add(match[1]);
                    }
                }
            } catch {}
        }
    } catch {}
    return Array.from(degiskenler);
}

// 🆕 v1.3.2: Webview ile performans raporu oluştur
function performansRaporuOlustur(context: vscode.ExtensionContext, profilVerisi: string) {
    const panel = vscode.window.createWebviewPanel(
        'pyotobaslatPerformans',
        '⚡ PyOtoBaşlat Performans Raporu',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // cProfile çıktısını parse et
    const satirlar = profilVerisi.split('\n').filter(s => s.trim());
    const baslikSatiri = satirlar.findIndex(s => s.includes('ncalls') && s.includes('tottime'));
    const veriSatirlari = baslikSatiri > -1 ? satirlar.slice(baslikSatiri + 1) : [];

    const raporVerisi = veriSatirlari.map(satir => {
        const parcalar = satir.trim().split(/\s+/);
        if (parcalar.length >= 5) {
            return {
                ncalls: parcalar[0],
                tottime: parseFloat(parcalar[1]),
                percall: parseFloat(parcalar[2]),
                cumtime: parseFloat(parcalar[3]),
                filename: parcalar.slice(4).join(' ')
            };
        }
        return null;
    }).filter(Boolean);

    panel.webview.html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
        h2 { color: var(--vscode-textLink-foreground); margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: var(--vscode-editorGroupHeader-tabsBackground); padding: 10px; text-align: left; cursor: pointer; user-select: none; position: sticky; top: 0; }
        th:hover { background: var(--vscode-list-hoverBackground); }
        td { padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border); }
        tr:hover { background: var(--vscode-list-hoverBackground); }
        .bar { height: 6px; background: var(--vscode-progressBar-background); border-radius: 3px; margin-top: 4px; }
        .slow { color: var(--vscode-errorForeground); font-weight: bold; }
        .info { margin-bottom: 15px; padding: 10px; background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textLink-foreground); border-radius: 4px; }
    </style>
</head>
<body>
    <h2>⚡ Performans Analiz Raporu</h2>
    <div class="info">💡 Sütun başlıklarına tıklayarak sıralama yapabilirsiniz. Kırmızı renkli satırlar en çok zaman harcayan fonksiyonlardır.</div>
    <table id="perfTable">
        <thead>
            <tr>
                <th onclick="sortTable(0)">Çağrı Sayısı</th>
                <th onclick="sortTable(1)">Toplam Süre (s)</th>
                <th onclick="sortTable(2)">Çağrı Başına (s)</th>
                <th onclick="sortTable(3)">Kümülatif Süre (s)</th>
                <th>Dosya / Fonksiyon</th>
            </tr>
        </thead>
        <tbody id="tableBody"></tbody>
    </table>
    <script>
        const data = ${JSON.stringify(raporVerisi)};
        const maxCum = Math.max(...data.map(d => d.cumtime), 0.001);
        
        function render(sortCol = 3, asc = false) {
            const sorted = [...data].sort((a, b) => {
                const keys = ['ncalls', 'tottime', 'percall', 'cumtime'];
                const key = keys[sortCol];
                if (key === 'filename') return asc ? a.filename.localeCompare(b.filename) : b.filename.localeCompare(a.filename);
                return asc ? a[key] - b[key] : b[key] - a[key];
            });
            
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = sorted.map((row, i) => {
                const barWidth = (row.cumtime / maxCum * 100).toFixed(1);
                const isSlow = row.tottime > 0.1;
                return \`<tr>
                    <td>\${row.ncalls}</td>
                    <td class="\${isSlow ? 'slow' : ''}">\${row.tottime.toFixed(4)}</td>
                    <td>\${row.percall.toFixed(4)}</td>
                    <td>
                        \${row.cumtime.toFixed(4)}
                        <div class="bar" style="width: \${barWidth}%"></div>
                    </td>
                    <td>\${row.filename}</td>
                </tr>\`;
            }).join('');
        }
        
        let sortDir = {};
        function sortTable(col) {
            sortDir[col] = !sortDir[col];
            render(col, sortDir[col]);
        }
        
        render(); // Varsayılan: kümülatif süreye göre azalan
    </script>
</body>
</html>`;
}

// ==================== ANA EXTENSION ====================
export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('pyotobaslat');

    // DURUM ÇUBUĞU: BAŞLAT BUTONU
    const baslatButonu = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    baslatButonu.text = "$(play) 🐍 Başlat";
    baslatButonu.tooltip = "Projeyi Hazırla ve Çalıştır (F5)";
    baslatButonu.command = "pyotobaslat.hazirlaVeCalistir";
    baslatButonu.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    baslatButonu.show();
    context.subscriptions.push(baslatButonu);

    // DURUM ÇUBUĞU: VENV GÖSTERGESİ
    const venvGostergesi = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    venvGostergesi.text = "$(loading) Python kontrol ediliyor...";
    venvGostergesi.tooltip = "Sanal Ortam Durumu";
    venvGostergesi.show();
    context.subscriptions.push(venvGostergesi);

    async function venvDurumunuGuncelle() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            venvGostergesi.text = "$(circle-slash) Klasör yok";
            return;
        }
        const rootPath = workspaceFolder.uri.fsPath;
        const venvPath = path.join(rootPath, '.venv');
        const isWindows = process.platform === 'win32';
        const pythonCmd = isWindows ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';

        if (fs.existsSync(venvPath)) {
            try {
                const versiyon = await runCommand(`${pythonCmd} --version`, rootPath);
                const temizVersiyon = versiyon.trim().replace('Python ', '');
                venvGostergesi.text = `$(beaker) .venv | Python ${temizVersiyon}`;
                venvGostergesi.backgroundColor = undefined;
            } catch {
                venvGostergesi.text = "$(warning) .venv bozuk";
                venvGostergesi.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            }
        } else {
            venvGostergesi.text = "$(circle-slash) venv yok";
            venvGostergesi.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
    }

    venvDurumunuGuncelle();
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => venvDurumunuGuncelle()));

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        gitignoreOlustur(workspaceFolder.uri.fsPath);
    }

    // ==================== ANA KOMUT: HAZIRLA VE ÇALIŞTIR ====================
    const hazirlaKomutu = vscode.commands.registerCommand('pyotobaslat.hazirlaVeCalistir', async () => {
        const wf = vscode.workspace.workspaceFolders?.[0];
        if (!wf) {
            vscode.window.showErrorMessage('❌ Lütfen önce bir Python proje klasörü açın!');
            return;
        }
        const rootPath = wf.uri.fsPath;
        const isWindows = process.platform === 'win32';
        const pythonCmd = isWindows ? 'python' : 'python3';
        const pipCmd = isWindows ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const venvPath = path.join(rootPath, '.venv');
        const reqPath = path.join(rootPath, 'requirements.txt');

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "🐍 PyOtoBaşlat Çalışıyor...",
            cancellable: false
        }, async (progress) => {
            try {
                // 1. VENV OLUŞTURMA
                if (config.get('venvOtomatikOlustur') && !fs.existsSync(venvPath)) {
                    progress.report({ message: "Sanal ortam (.venv) oluşturuluyor..." });
                    await runCommand(`${pythonCmd} -m venv .venv`, rootPath);
                    gitignoreOlustur(rootPath);
                    vscode.window.showInformationMessage('✅ Sanal ortam başarıyla oluşturuldu!');
                    await venvDurumunuGuncelle();
                }

                // 2. REQUIREMENTS.TXT KURULUMU
                if (config.get('otomatikKurulum') && fs.existsSync(reqPath)) {
                    progress.report({ message: "requirements.txt kuruluyor..." });
                    await runCommand(`${pipCmd} install -r requirements.txt`, rootPath);
                    vscode.window.showInformationMessage('✅ requirements.txt paketleri kuruldu!');
                }

                // 3. EKSİK PAKETLERİ AKILLI ALGILAMA
                if (config.get('otomatikPaketKontrol')) {
                    progress.report({ message: "Eksik paketler taranıyor..." });
                    const eksikPaketler = await eksikPaketleriKontrolEt(rootPath, pipCmd);
                    if (eksikPaketler.length > 0) {
                        const secim = await vscode.window.showWarningMessage(
                            `📦 ${eksikPaketler.length} eksik paket bulundu: ${eksikPaketler.slice(0, 3).join(', ')}${eksikPaketler.length > 3 ? '...' : ''}`,
                            "Otomatik Kur", "Yoksay"
                        );
                        if (secim === "Otomatik Kur") {
                            progress.report({ message: "Eksik paketler kuruluyor..." });
                            await runCommand(`${pipCmd} install ${eksikPaketler.join(' ')}`, rootPath);
                            let reqIcerik = fs.existsSync(reqPath) ? fs.readFileSync(reqPath, 'utf-8') : '';
                            for (const paket of eksikPaketler) {
                                if (!reqIcerik.includes(paket)) reqIcerik += `\n${paket}`;
                            }
                            fs.writeFileSync(reqPath, reqIcerik.trim());
                            vscode.window.showInformationMessage(`✅ ${eksikPaketler.length} paket kuruldu ve requirements.txt güncellendi!`);
                        }
                    }
                }

                // 🆕 v1.3.2: .ENV SİHİRBAZI
                const envDegiskenleri = await envDegiskenleriniTara(rootPath);
                const envPath = path.join(rootPath, '.env');
                if (envDegiskenleri.length > 0 && !fs.existsSync(envPath)) {
                    const secim = await vscode.window.showInformationMessage(
                        `🌍 ${envDegiskenleri.length} ortam değişkeni tespit edildi ama .env dosyası yok. Oluşturulsun mu?`,
                        "Şablon Oluştur", "Sonra"
                    );
                    if (secim === "Şablon Oluştur") {
                        const envIcerik = envDegiskenleri.map(d => `${d}=\n`).join('');
                        fs.writeFileSync(envPath, `# PyOtoBaşlat tarafından oluşturuldu\n# Değerleri doldurun\n\n${envIcerik}`);
                        vscode.window.showInformationMessage('✅ .env şablonu oluşturuldu! Değerleri doldurmayı unutmayın.');
                        // .env dosyasını aç
                        const doc = await vscode.workspace.openTextDocument(envPath);
                        await vscode.window.showTextDocument(doc);
                    }
                }

                // 4. PROJE TÜRÜ ALGILAMA VE ÇALIŞTIRMA
                const calistirmaModu = config.get('calistirmaModu') as string;
                const terminal = getOrCreateTerminal('🐍 PyOtoBaşlat');
                let komut = '';
                const activateCmd = isWindows ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate';

                if (calistirmaModu === 'django' || (calistirmaModu === 'otomatik' && fs.existsSync(path.join(rootPath, 'manage.py')))) {
                    komut = `${activateCmd} && python manage.py runserver`;
                    progress.report({ message: "Django sunucusu başlatılıyor..." });
                } else if (calistirmaModu === 'flask' || (calistirmaModu === 'otomatik' && fs.existsSync(path.join(rootPath, 'app.py')) && dosyaIcerikKontrol(rootPath, 'app.py', 'Flask'))) {
                    komut = `${activateCmd} && flask run`;
                    progress.report({ message: "Flask sunucusu başlatılıyor..." });
                } else if (calistirmaModu === 'fastapi' || (calistirmaModu === 'otomatik' && dosyaIcerikKontrol(rootPath, 'main.py', 'FastAPI'))) {
                    komut = `${activateCmd} && uvicorn main:app --reload`;
                    progress.report({ message: "FastAPI sunucusu başlatılıyor..." });
                } else {
                    const pyFiles = fs.readdirSync(rootPath).filter(f => f.endsWith('.py'));
                    const targetFile = pyFiles.find(f => ['main.py', 'app.py', 'run.py'].includes(f)) || pyFiles[0];
                    if (!targetFile) throw new Error('Projede .py dosyası bulunamadı!');
                    komut = `${activateCmd} && python ${targetFile}`;
                    progress.report({ message: `${targetFile} başlatılıyor...` });
                }

                terminal.sendText(komut);
                terminal.show();
                vscode.window.showInformationMessage('🚀 Proje başarıyla başlatıldı!');

            } catch (error: any) {
                const hataMesaji = error.message || String(error);
                const hataBilgisi = turkceHataCozum(hataMesaji);

                if (hataBilgisi && config.get('hataCevirmeniAktif')) {
                    const { hataTur, cozum } = hataBilgisi;
                    const butonlar = ["Anladım"];
                    if (cozum.komut) butonlar.push("Otomatik Düzelt");
                    butonlar.push("Detaylı Yardım");

                    const secim = await vscode.window.showErrorMessage(
                        `❌ ${hataTur}: ${cozum.aciklama}`,
                        { modal: true, detail: cozum.cozum },
                        ...butonlar
                    );

                    if (secim === "Otomatik Düzelt" && cozum.komut) {
                        const terminal = getOrCreateTerminal('🐍 PyOtoBaşlat');
                        if (cozum.komut === "port_degistir") {
                            const yeniPort = await vscode.window.showInputBox({ prompt: "Yeni port numarası girin", value: "8001" });
                            if (yeniPort) {
                                const isWin = process.platform === 'win32';
                                const activateCmd = isWin ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate';
                                terminal.sendText(`${activateCmd} && python manage.py runserver ${yeniPort}`);
                                terminal.show();
                            }
                        } else {
                            const paketAdi = hataMesaji.match(/No module named '(\w+)'/)?.[1] || 'paket';
                            const cmd = cozum.komut.replace('{paket}', paketAdi);
                            terminal.sendText(cmd);
                            terminal.show();
                        }
                    } else if (secim === "Detaylı Yardım") {
                        vscode.env.openExternal(vscode.Uri.parse(`https://docs.python.org/3/library/exceptions.html#${hataTur.toLowerCase()}`));
                    }
                } else {
                    vscode.window.showErrorMessage(`❌ Hata: ${hataMesaji}`);
                }
            }
        });
    });

    // ==================== 🆕 PERFORMANS ANALİZİ (WEBVIEW) ====================
    const performansKomutu = vscode.commands.registerCommand('pyotobaslat.performansAnalizi', async () => {
        const wf = vscode.workspace.workspaceFolders?.[0];
        if (!wf) {
            vscode.window.showErrorMessage('❌ Lütfen önce bir Python proje klasörü açın!');
            return;
        }
        const rootPath = wf.uri.fsPath;
        const isWindows = process.platform === 'win32';
        const activateCmd = isWindows ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate';

        const pyFiles = fs.readdirSync(rootPath).filter(f => f.endsWith('.py'));
        const targetFile = pyFiles.find(f => ['main.py', 'app.py', 'run.py'].includes(f)) || pyFiles[0];
        if (!targetFile) {
            vscode.window.showErrorMessage('❌ Analiz edilecek .py dosyası bulunamadı!');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "⚡ Performans analizi yapılıyor...",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: `${targetFile} profil ediliyor...` });
                const profilVerisi = await runCommand(
                    `${activateCmd} && python -m cProfile -s cumulative ${targetFile}`,
                    rootPath
                );
                performansRaporuOlustur(context, profilVerisi);
                vscode.window.showInformationMessage('⚡ Performans raporu hazır!');
            } catch (error: any) {
                // cProfile hata verirse bile çıktıyı göstermeye çalış
                const cikti = error.message || String(error);
                if (cikti.includes('ncalls') || cikti.includes('tottime')) {
                    performansRaporuOlustur(context, cikti);
                } else {
                    vscode.window.showErrorMessage(`❌ Performans analizi hatası: ${cikti}`);
                }
            }
        });
    });

    // ==================== PAKET GÜNCELLEME KOMUTU ====================
    const paketGuncelleKomutu = vscode.commands.registerCommand('pyotobaslat.paketleriGuncelle', async () => {
        const wf = vscode.workspace.workspaceFolders?.[0];
        if (!wf) {
            vscode.window.showErrorMessage('❌ Lütfen önce bir Python proje klasörü açın!');
            return;
        }
        const rootPath = wf.uri.fsPath;
        const isWindows = process.platform === 'win32';
        const pipCmd = isWindows ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "📦 Paketler kontrol ediliyor...",
            cancellable: false
        }, async (progress) => {
            try {
                const eksikPaketler = await eksikPaketleriKontrolEt(rootPath, pipCmd);
                if (eksikPaketler.length === 0) {
                    vscode.window.showInformationMessage('✅ Tüm paketler kurulu!');
                    return;
                }
                const secim = await vscode.window.showWarningMessage(
                    `📦 ${eksikPaketler.length} eksik paket: ${eksikPaketler.join(', ')}`,
                    "Hepsini Kur", "İptal"
                );
                if (secim === "Hepsini Kur") {
                    progress.report({ message: "Paketler kuruluyor..." });
                    await runCommand(`${pipCmd} install ${eksikPaketler.join(' ')}`, rootPath);
                    const reqPath = path.join(rootPath, 'requirements.txt');
                    let reqIcerik = fs.existsSync(reqPath) ? fs.readFileSync(reqPath, 'utf-8') : '';
                    for (const paket of eksikPaketler) {
                        if (!reqIcerik.includes(paket)) reqIcerik += `\n${paket}`;
                    }
                    fs.writeFileSync(reqPath, reqIcerik.trim());
                    vscode.window.showInformationMessage(`✅ ${eksikPaketler.length} paket kuruldu!`);
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`❌ Paket kontrolü hatası: ${error.message}`);
            }
        });
    });

    // ==================== GÜVENLİK TARAMASI KOMUTU ====================
    const guvenlikKomutu = vscode.commands.registerCommand('pyotobaslat.guvenlikTaramasi', async () => {
        const wf = vscode.workspace.workspaceFolders?.[0];
        if (!wf) {
            vscode.window.showErrorMessage('❌ Lütfen önce bir Python proje klasörü açın!');
            return;
        }
        const rootPath = wf.uri.fsPath;
        const isWindows = process.platform === 'win32';
        const pipCmd = isWindows ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const activateCmd = isWindows ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate';

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "🔒 Güvenlik taraması yapılıyor...",
            cancellable: false
        }, async (progress) => {
            try {
                try {
                    await runCommand(`${pipCmd} show pip-audit`, rootPath);
                } catch {
                    progress.report({ message: "pip-audit kuruluyor..." });
                    await runCommand(`${pipCmd} install pip-audit`, rootPath);
                }
                progress.report({ message: "Bağımlılıklar taranıyor..." });
                const terminal = getOrCreateTerminal('🔒 PyOtoBaşlat Güvenlik');
                terminal.sendText(`${activateCmd} && pip-audit --desc on`);
                terminal.show();
                vscode.window.showInformationMessage('🔒 Güvenlik taraması terminalde başladı!');
            } catch (error: any) {
                vscode.window.showErrorMessage(`❌ Güvenlik taraması hatası: ${error.message}`);
            }
        });
    });

    // ==================== AYARLAR KOMUTU ====================
    const ayarlarKomutu = vscode.commands.registerCommand('pyotobaslat.ayarlarAc', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'pyotobaslat');
    });

    context.subscriptions.push(
        hazirlaKomutu,
        performansKomutu,
        paketGuncelleKomutu,
        guvenlikKomutu,
        ayarlarKomutu
    );
}

export function deactivate() {}