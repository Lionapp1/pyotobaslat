import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ==================== HATA SÖZLÜĞÜ & SELF-HEALING ====================
interface HataCozum {
    aciklama: string;
    cozum: string;
    komut?: string;
    healingType?: 'pip_install' | 'pip_upgrade' | 'venv_recreate' | 'build_deps' | 'cache_clear';
}

const HATA_SOZLUGU: Record<string, HataCozum> = {
    "ModuleNotFoundError": { aciklama: "📦 Eksik Modül: Bu paket/modül yüklü değil.", cozum: "Otomatik kuruyorum...", healingType: 'pip_install' },
    "ImportError": { aciklama: "📥 İçe Aktarma Hatası: Modül bozuk veya eksik.", cozum: "Yeniden kuruyorum...", healingType: 'pip_install' },
    "subprocess-exited-with-error": { aciklama: "🔨 Build Hatası: Paket derlenemedi.", cozum: "Build araçlarını güncelliyorum...", healingType: 'build_deps' },
    "Getting requirements to build wheel": { aciklama: "⚙️ Wheel Build Hatası.", cozum: "setuptools/pip güncelleniyor...", healingType: 'build_deps' },
    "PermissionError": { aciklama: "🔒 İzin Hatası.", cozum: "Sanal ortam sıfırlanıyor...", healingType: 'venv_recreate' },
    "No matching distribution found": { aciklama: "🔍 Uyumsuz Sürüm.", cozum: "Python sürümünüzü kontrol edin." },
    "SyntaxError": { aciklama: "✍️ Söz Dizimi Hatası.", cozum: "Satır numarasını kontrol edin." },
    "IndentationError": { aciklama: "↔️ Girinti Hatası.", cozum: "Hizalamayı düzeltin." },
    "NameError": { aciklama: "🏷️ Tanımsız İsim.", cozum: "Değişkeni tanımlayın." },
    "TypeError": { aciklama: "🔄 Tür Hatası.", cozum: "Veri türlerini kontrol edin." },
    "ValueError": { aciklama: "⚠️ Değer Hatası.", cozum: "Doğru değer verin." },
    "FileNotFoundError": { aciklama: "📁 Dosya Bulunamadı.", cozum: "Dosya yolunu kontrol edin." },
    "ZeroDivisionError": { aciklama: "➗ Sıfıra Bölme.", cozum: "Bölen değeri kontrol edin." },
    "AttributeError": { aciklama: "🔧 Nitelik Hatası.", cozum: "Nesne metodlarını kontrol edin." },
    "IndexError": { aciklama: "📋 Liste İndeksi Hatası.", cozum: "Liste uzunluğunu kontrol edin." },
    "KeyError": { aciklama: "🔑 Anahtar Hatası.", cozum: "Anahtarı kontrol edin." },
    "ConnectionError": { aciklama: "🌐 Bağlantı Hatası.", cozum: "İnternet/URL kontrolü." },
    "Address already in use": { aciklama: "🚪 Port Meşgul.", cozum: "Farklı portta başlatıyorum...", komut: "port_degistir" },
    "RecursionError": { aciklama: "🔁 Özyineleme Hatası.", cozum: "Sonsuz döngüyü kontrol edin." },
    "MemoryError": { aciklama: "💾 Bellek Yetersiz.", cozum: "RAM kullanımını optimize edin." },
    "UnicodeDecodeError": { aciklama: "🔤 Karakter Kodlama Hatası.", cozum: "encoding='utf-8' kullanın." },
    "TimeoutError": { aciklama: "⏱️ Zaman Aşımı.", cozum: "Bağlantı mantığını kontrol edin." }
};

function turkceHataCozum(hataMesaji: string): { hataTur: string; cozum: HataCozum } | null {
    for (const [hataTur, cozum] of Object.entries(HATA_SOZLUGU)) {
        if (hataMesaji.includes(hataTur)) return { hataTur, cozum };
    }
    return null;
}

// ==================== YARDIMCI FONKSİYONLAR ====================
function runCommand(cmd: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd, maxBuffer: 1024 * 1024 * 10, shell: '/bin/bash' }, (error, stdout, stderr) => {
            if (error) reject(new Error(stderr || error.message));
            else resolve(stdout);
        });
    });
}

/**
 * 🆕 POSIX UYUMLU AKTİVASYON KOMUTU
 * Linux'ta source yerine . kullanılır, Windows'ta activate.bat
 */
function getActivateCmd(isWindows: boolean): string {
    return isWindows ? '.venv\\Scripts\\activate.bat' : '. .venv/bin/activate';
}

function dosyaIcerikKontrol(dizin: string, dosyaAdi: string, kelime: string): boolean {
    try { return fs.readFileSync(path.join(dizin, dosyaAdi), 'utf-8').includes(kelime); }
    catch { return false; }
}

/**
 * 🆕 GELİŞMİŞ PAKET TARAMA
 * - Alt klasörleri tarar
 * - from PyQt6.QtWebEngineWidgets import X kalıbını destekler
 * - Kök paketi (PyQt6) çıkarır
 */
async function importEdilenPaketleriBul(rootPath: string): Promise<string[]> {
    const paketler = new Set<string>();
    const stdLib = new Set([
        'os','sys','json','math','datetime','time','random','re','collections',
        'itertools','functools','pathlib','typing','unittest','logging','argparse',
        'csv','sqlite3','threading','multiprocessing','subprocess','shutil','glob',
        'hashlib','abc','io','string','decimal','fractions','copy','pprint',
        'textwrap','struct','codecs','unicodedata','locale','gettext','enum',
        'dataclasses','contextlib','warnings','traceback','inspect','dis',
        'ast','token','tokenize','platform','signal','socket','http','urllib',
        'email','html','xml','configparser','secrets','uuid','base64','binascii',
        'array','bisect','heapq','queue','weakref','types','pdb','profile',
        'cProfile','timeit','trace','gc','site','builtins','__future__'
    ]);

    // Mapping: alt modül -> kök paket adı
    const paketEsleme: Record<string, string> = {
        'PyQt6': 'PyQt6',
        'PyQt5': 'PyQt5',
        'cv2': 'opencv-python',
        'sklearn': 'scikit-learn',
        'bs4': 'beautifulsoup4',
        'PIL': 'Pillow',
        'yaml': 'pyyaml',
        'dotenv': 'python-dotenv',
        'jwt': 'PyJWT',
        'serial': 'pyserial',
        'usb': 'pyusb',
        'gi': 'PyGObject',
        'wx': 'wxPython',
        'fitz': 'PyMuPDF',
        'Bio': 'biopython',
        'lxml': 'lxml',
        'np': 'numpy',
        'pd': 'pandas',
        'tf': 'tensorflow',
        'torch': 'torch',
    };

    try {
        const files = await vscode.workspace.findFiles('**/*.py', '**/{.venv,node_modules,__pycache__,.git,build,dist,env,ENV}/**');
        await Promise.all(files.map(async (file) => {
            try {
                const content = await fs.promises.readFile(file.fsPath, 'utf-8');
                // Hem import X hem from X.Y.Z import W kalıplarını yakala
                const matches = content.match(/^(?:import|from)\s+([\w.]+)/gm) || [];
                for (const match of matches) {
                    const fullMod = match.replace(/^(?:import|from)\s+/, '');
                    const rootPkg = fullMod.split('.')[0];
                    
                    if (!stdLib.has(rootPkg)) {
                        // Özel eşleştirme varsa kullan, yoksa kök paket adını al
                        const pipPaket = paketEsleme[rootPkg] || rootPkg;
                        paketler.add(pipPaket);
                    }
                }
            } catch {}
        }));
    } catch {}
    return Array.from(paketler);
}

/**
 * 🆕 GERÇEK DOĞRULAMA: python -c "import paket"
 * pip show yerine gerçekten import edilebilir mi kontrol eder
 */
async function eksikPaketleriKontrolEt(rootPath: string, pythonCmd: string): Promise<string[]> {
    const importEdilen = await importEdilenPaketleriBul(rootPath);
    const eksikler: string[] = [];
    
    // Paralel kontrol (max 5 concurrent)
    for (let i = 0; i < importEdilen.length; i += 5) {
        const chunk = importEdilen.slice(i, i + 5);
        const results = await Promise.allSettled(
            chunk.map(paket => {
                // Import adını geri çöz (pip paketi -> import adı)
                const importAdi = paket === 'opencv-python' ? 'cv2' 
                    : paket === 'scikit-learn' ? 'sklearn'
                    : paket === 'beautifulsoup4' ? 'bs4'
                    : paket === 'Pillow' ? 'PIL'
                    : paket === 'pyyaml' ? 'yaml'
                    : paket === 'python-dotenv' ? 'dotenv'
                    : paket === 'PyJWT' ? 'jwt'
                    : paket === 'pyserial' ? 'serial'
                    : paket === 'PyGObject' ? 'gi'
                    : paket === 'wxPython' ? 'wx'
                    : paket === 'PyMuPDF' ? 'fitz'
                    : paket === 'biopython' ? 'Bio'
                    : paket;
                return runCommand(`${pythonCmd} -c "import ${importAdi}"`, rootPath);
            })
        );
        results.forEach((r, idx) => { 
            if (r.status === 'rejected') eksikler.push(chunk[idx]); 
        });
    }
    return eksikler;
}

function getOrCreateTerminal(name: string): vscode.Terminal {
    return vscode.window.terminals.find(t => t.name === name) || vscode.window.createTerminal(name);
}

function gitignoreOlustur(rootPath: string) {
    const p = path.join(rootPath, '.gitignore');
    if (fs.existsSync(p)) return;
    fs.writeFileSync(p, `# Python\n__pycache__/\n*.py[cod]\n*.so\n.Python\nbuild/\ndist/\n*.egg-info/\n\n# Venv\n.venv/\nvenv/\n\n# IDE\n.vscode/\n.idea/\n\n# Env\n.env\n.env.local\n\n# OS\n.DS_Store\nThumbs.db\n`);
}

async function envDegiskenleriniTara(rootPath: string): Promise<string[]> {
    const degiskenler = new Set<string>();
    try {
        const files = await vscode.workspace.findFiles('**/*.py', '**/{.venv,node_modules,__pycache__,.git}/**');
        for (const file of files) {
            try {
                const content = await fs.promises.readFile(file.fsPath, 'utf-8');
                [/os\.getenv\(['"](\w+)['"]/g, /os\.environ\[?['"](\w+)['"]\]?/g, /config\(['"](\w+)['"]\)/g].forEach(pattern => {
                    let m; while ((m = pattern.exec(content)) !== null) degiskenler.add(m[1]);
                });
            } catch {}
        }
    } catch {}
    return Array.from(degiskenler);
}

// 🆕 SELF-HEALING MOTORU
async function otomatikDuzelt(rootPath: string, tip: string, pipCmd: string, pythonCmd: string, progress: vscode.Progress<{ message?: string }>, hataMesaji?: string): Promise<boolean> {
    try {
        switch (tip) {
            case 'pip_install': {
                // Hata mesajından paket adını çıkar
                const paketMatch = hataMesaji?.match(/No module named '([\w.]+)'/);
                if (paketMatch) {
                    const mod = paketMatch[1];
                    const kokPaket = mod.split('.')[0];
                    // Özel eşleştirme
                    const pipPaket = kokPaket === 'PyQt6' ? 'PyQt6 PyQt6-WebEngine' 
                        : kokPaket === 'cv2' ? 'opencv-python'
                        : kokPaket === 'sklearn' ? 'scikit-learn'
                        : kokPaket === 'bs4' ? 'beautifulsoup4'
                        : kokPaket === 'PIL' ? 'Pillow'
                        : kokPaket === 'yaml' ? 'pyyaml'
                        : kokPaket === 'dotenv' ? 'python-dotenv'
                        : kokPaket;
                    
                    progress.report({ message: `📦 ${pipPaket} kuruluyor...` });
                    await runCommand(`${pipCmd} install ${pipPaket}`, rootPath);
                    return true;
                }
                return false;
            }
            case 'build_deps':
                progress.report({ message: "🔧 Build araçları güncelleniyor..." });
                await runCommand(`${pipCmd} install --upgrade pip setuptools wheel`, rootPath);
                progress.report({ message: "🧹 Pip cache temizleniyor..." });
                await runCommand(`${pipCmd} cache purge`, rootPath);
                return true;
            case 'venv_recreate':
                progress.report({ message: "♻️ Sanal ortam sıfırlanıyor..." });
                const venvPath = path.join(rootPath, '.venv');
                if (fs.existsSync(venvPath)) fs.rmSync(venvPath, { recursive: true, force: true });
                await runCommand(`${pythonCmd} -m venv .venv`, rootPath);
                progress.report({ message: "📦 Temel paketler kuruluyor..." });
                await runCommand(`${pipCmd} install --upgrade pip setuptools wheel`, rootPath);
                return true;
            default: return false;
        }
    } catch (e) { console.error(`Self-healing hatası (${tip}):`, e); return false; }
}

function performansRaporuOlustur(context: vscode.ExtensionContext, profilVerisi: string) {
    const panel = vscode.window.createWebviewPanel('pyotobaslatPerformans', '⚡ Performans Raporu', vscode.ViewColumn.One, { enableScripts: true });
    const satirlar = profilVerisi.split('\n').filter(s => s.trim());
    const baslikIdx = satirlar.findIndex(s => s.includes('ncalls') && s.includes('tottime'));
    const veri = baslikIdx > -1 ? satirlar.slice(baslikIdx + 1).map(s => {
        const p = s.trim().split(/\s+/);
        return p.length >= 5 ? { ncalls: p[0], tottime: parseFloat(p[1]), percall: parseFloat(p[2]), cumtime: parseFloat(p[3]), filename: p.slice(4).join(' ') } : null;
    }).filter(Boolean) : [];

    panel.webview.html = `<!DOCTYPE html><html><head><style>
body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
table{width:100%;border-collapse:collapse;font-size:13px}th{background:var(--vscode-editorGroupHeader-tabsBackground);padding:10px;text-align:left;cursor:pointer;position:sticky;top:0}
td{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border)}tr:hover{background:var(--vscode-list-hoverBackground)}
.bar{height:6px;background:var(--vscode-progressBar-background);border-radius:3px;margin-top:4px}.slow{color:var(--vscode-errorForeground);font-weight:bold}
</style></head><body><h2>⚡ Performans Analiz Raporu</h2>
<table><thead><tr><th onclick="sort(0)">Çağrı</th><th onclick="sort(1)">Toplam(s)</th><th onclick="sort(2)">ÇağrıBaşı(s)</th><th onclick="sort(3)">Kümülatif(s)</th><th>Dosya/Fonksiyon</th></tr></thead>
<tbody id="tb"></tbody></table>
<script>const d=${JSON.stringify(veri)};const mx=Math.max(...d.map(r=>r.cumtime),0.001);let dir={};
function render(c=3,a=false){const s=[...d].sort((x,y)=>{const k=['ncalls','tottime','percall','cumtime'];return a?x[k[c]]-y[k[c]]:y[k[c]]-x[k[c]];});
document.getElementById('tb').innerHTML=s.map(r=>{const w=(r.cumtime/mx*100).toFixed(1);const sl=r.tottime>0.1?'slow':'';
return \`<tr><td>\${r.ncalls}</td><td class="\${sl}">\${r.tottime.toFixed(4)}</td><td>\${r.percall.toFixed(4)}</td><td>\${r.cumtime.toFixed(4)}<div class="bar" style="width:\${w}%"></div></td><td>\${r.filename}</td></tr>\`;}).join('');}
function sort(c){dir[c]=!dir[c];render(c,dir[c]);}render();</script></body></html>`;
}

// ==================== ANA EXTENSION ====================
export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('pyotobaslat');

    // ✅ SADECE VENV GÖSTERGESİ (Başlat butonu kaldırıldı)
    const venvGostergesi = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    venvGostergesi.text = "$(loading) Python kontrol ediliyor...";
    venvGostergesi.tooltip = "PyOtoBaşlat: Sanal Ortam Durumu";
    venvGostergesi.command = "pyotobaslat.hazirlaVeCalistir";
    venvGostergesi.show();
    context.subscriptions.push(venvGostergesi);

    async function venvDurumunuGuncelle() {
        const wf = vscode.workspace.workspaceFolders?.[0];
        if (!wf) { venvGostergesi.text = "$(circle-slash) Klasör yok"; return; }
        const rp = wf.uri.fsPath, vp = path.join(rp, '.venv'), win = process.platform === 'win32';
        const pc = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
        if (fs.existsSync(vp)) {
            try {
                const v = (await runCommand(`${pc} --version`, rp)).trim().replace('Python ', '');
                venvGostergesi.text = `$(beaker) Python ${v}`;
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
    const wf = vscode.workspace.workspaceFolders?.[0];
    if (wf) gitignoreOlustur(wf.uri.fsPath);

    // ==================== HAZIRLA VE ÇALIŞTIR (SELF-HEALING + POSIX FIX) ====================
    const hazirlaKomutu = vscode.commands.registerCommand('pyotobaslat.hazirlaVeCalistir', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Lütfen önce bir Python proje klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const pc = win ? 'python' : 'python3';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const vp = path.join(rp, '.venv'), req = path.join(rp, 'requirements.txt');
        const act = getActivateCmd(win); // 🆕 POSIX UYUMLU

        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🐍 PyOtoBaşlat Çalışıyor...", cancellable: false }, async (progress) => {
            try {
                // 1. VENV OLUŞTURMA
                if (config.get('venvOtomatikOlustur') && !fs.existsSync(vp)) {
                    progress.report({ message: "Sanal ortam oluşturuluyor..." });
                    await runCommand(`${pc} -m venv .venv`, rp);
                    gitignoreOlustur(rp);
                    await runCommand(`${pip} install --upgrade pip setuptools wheel`, rp);
                    vscode.window.showInformationMessage('✅ Sanal ortam oluşturuldu!');
                    await venvDurumunuGuncelle();
                }

                // 2. REQUIREMENTS.TXT KURULUMU (SELF-HEALING)
                if (config.get('otomatikKurulum') && fs.existsSync(req)) {
                    progress.report({ message: "requirements.txt kuruluyor..." });
                    try {
                        await runCommand(`${pip} install -r requirements.txt`, rp);
                        vscode.window.showInformationMessage('✅ requirements.txt kuruldu!');
                    } catch (installError: any) {
                        const hm = installError.message || String(installError);
                        const hb = turkceHataCozum(hm);
                        if (hb?.cozum.healingType && config.get('selfHealingAktif')) {
                            vscode.window.showWarningMessage(`⚠️ Kurulum hatası. Otomatik düzeltiliyor...`);
                            const duzeltildi = await otomatikDuzelt(rp, hb.cozum.healingType, pip, pc, progress, hm);
                            if (duzeltildi) {
                                progress.report({ message: "🔄 Kurulum tekrar deneniyor..." });
                                await runCommand(`${pip} install -r requirements.txt`, rp);
                                vscode.window.showInformationMessage('✅ Hata düzeltildi, kurulum tamamlandı!');
                            } else { throw installError; }
                        } else { throw installError; }
                    }
                }

                // 3. 🆕 GERÇEK EKSİK PAKET TARAMASI (python -c "import")
                if (config.get('otomatikPaketKontrol')) {
                    progress.report({ message: "Eksik modüller taranıyor (derin tarama)..." });
                    const venvPython = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
                    const eksik = await eksikPaketleriKontrolEt(rp, venvPython);
                    if (eksik.length > 0) {
                        const sec = await vscode.window.showWarningMessage(
                            `📦 ${eksik.length} eksik modül: ${eksik.slice(0,3).join(', ')}`, 
                            "Otomatik Kur", "Yoksay"
                        );
                        if (sec === "Otomatik Kur") {
                            progress.report({ message: "Eksik modüller kuruluyor..." });
                            await runCommand(`${pip} install ${eksik.join(' ')}`, rp);
                            let ri = fs.existsSync(req) ? fs.readFileSync(req, 'utf-8') : '';
                            eksik.forEach(p => { if (!ri.includes(p)) ri += `\n${p}`; });
                            fs.writeFileSync(req, ri.trim());
                            vscode.window.showInformationMessage(`✅ ${eksik.length} modül kuruldu!`);
                        }
                    }
                }

                // 4. .ENV SİHİRBAZI
                if (config.get('envSihirbaziAktif')) {
                    const envVars = await envDegiskenleriniTara(rp);
                    const envPath = path.join(rp, '.env');
                    if (envVars.length > 0 && !fs.existsSync(envPath)) {
                        const sec = await vscode.window.showInformationMessage(
                            `🌍 ${envVars.length} ortam değişkeni tespit edildi. .env oluşturulsun mu?`, 
                            "Şablon Oluştur", "Sonra"
                        );
                        if (sec === "Şablon Oluştur") {
                            fs.writeFileSync(envPath, `# PyOtoBaşlat tarafından oluşturuldu\n\n${envVars.map(v => `${v}=\n`).join('')}`);
                            vscode.window.showInformationMessage('✅ .env şablonu oluşturuldu!');
                            const doc = await vscode.workspace.openTextDocument(envPath);
                            await vscode.window.showTextDocument(doc);
                        }
                    }
                }

                // 5. PROJE TÜRÜ ALGILAMA VE ÇALIŞTIRMA
                const mod = config.get('calistirmaModu') as string;
                const term = getOrCreateTerminal('🐍 PyOtoBaşlat');
                let cmd = '';
                if (mod === 'django' || (mod === 'otomatik' && fs.existsSync(path.join(rp, 'manage.py')))) { 
                    cmd = `${act} && python manage.py runserver`; 
                    progress.report({ message: "Django başlatılıyor..." }); 
                } else if (mod === 'flask' || (mod === 'otomatik' && fs.existsSync(path.join(rp, 'app.py')) && dosyaIcerikKontrol(rp, 'app.py', 'Flask'))) { 
                    cmd = `${act} && flask run`; 
                    progress.report({ message: "Flask başlatılıyor..." }); 
                } else if (mod === 'fastapi' || (mod === 'otomatik' && dosyaIcerikKontrol(rp, 'main.py', 'FastAPI'))) { 
                    cmd = `${act} && uvicorn main:app --reload`; 
                    progress.report({ message: "FastAPI başlatılıyor..." }); 
                } else {
                    const pyf = fs.readdirSync(rp).filter(f => f.endsWith('.py'));
                    const tf = pyf.find(f => ['main.py','app.py','run.py'].includes(f)) || pyf[0];
                    if (!tf) throw new Error('Projede .py dosyası bulunamadı!');
                    cmd = `${act} && python ${tf}`; 
                    progress.report({ message: `${tf} başlatılıyor...` });
                }
                term.sendText(cmd); term.show();
                vscode.window.showInformationMessage('🚀 Proje başarıyla başlatıldı!');

            } catch (error: any) {
                const hm = error.message || String(error);
                const hb = turkceHataCozum(hm);
                
                // 🆕 SELF-HEALING: ModuleNotFoundError için otomatik kur
                if (hb?.cozum.healingType === 'pip_install' && config.get('selfHealingAktif')) {
                    vscode.window.showWarningMessage(`⚠️ ${hb.cozum.aciklama} Otomatik düzeltiliyor...`);
                    const duzeltildi = await otomatikDuzelt(rp, 'pip_install', pip, pc, { report: (m: any) => {} } as any, hm);
                    if (duzeltildi) {
                        vscode.window.showInformationMessage('✅ Modül kuruldu! Projeyi tekrar başlatın.');
                        return;
                    }
                }
                
                if (hb && config.get('hataCevirmeniAktif')) {
                    const { hataTur, cozum } = hb;
                    const btns = ["Anladım"]; if (cozum.komut) btns.push("Manuel Düzelt"); btns.push("Detaylı Yardım");
                    const sec = await vscode.window.showErrorMessage(`❌ ${hataTur}: ${cozum.aciklama}`, { modal: true, detail: cozum.cozum }, ...btns);
                    if (sec === "Manuel Düzelt" && cozum.komut) {
                        const term = getOrCreateTerminal('🐍 PyOtoBaşlat');
                        if (cozum.komut === "port_degistir") {
                            const port = await vscode.window.showInputBox({ prompt: "Yeni port:", value: "8001" });
                            if (port) { term.sendText(`${act} && python manage.py runserver ${port}`); term.show(); }
                        } else {
                            const pkg = hm.match(/No module named '([\w.]+)'/)?.[1]?.split('.')[0] || 'paket';
                            term.sendText(`${pip} install ${pkg}`); term.show();
                        }
                    } else if (sec === "Detaylı Yardım") { 
                        vscode.env.openExternal(vscode.Uri.parse(`https://docs.python.org/3/library/exceptions.html#${hataTur.toLowerCase()}`)); 
                    }
                } else { 
                    vscode.window.showErrorMessage(`❌ Hata: ${hm}`); 
                }
            }
        });
    });

    // ==================== PERFORMANS ANALİZİ (WEBVIEW + POSIX FIX) ====================
    const performansKomutu = vscode.commands.registerCommand('pyotobaslat.performansAnalizi', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const act = getActivateCmd(win); // 🆕 POSIX UYUMLU
        const pyf = fs.readdirSync(rp).filter(f => f.endsWith('.py'));
        const tf = pyf.find(f => ['main.py','app.py','run.py'].includes(f)) || pyf[0];
        if (!tf) { vscode.window.showErrorMessage('❌ .py dosyası bulunamadı!'); return; }
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "⚡ Performans analizi...", cancellable: false }, async (progress) => {
            try {
                progress.report({ message: `${tf} profil ediliyor...` });
                const out = await runCommand(`${act} && python -m cProfile -s cumulative ${tf}`, rp);
                performansRaporuOlustur(context, out);
            } catch (e: any) {
                const msg = e.message || String(e);
                if (msg.includes('ncalls')) performansRaporuOlustur(context, msg);
                else vscode.window.showErrorMessage(`❌ Performans hatası: ${msg}`);
            }
        });
    });

    // ==================== PAKET GÜNCELLEME ====================
    const paketGuncelleKomutu = vscode.commands.registerCommand('pyotobaslat.paketleriGuncelle', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const venvPython = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "📦 Derin paket taraması...", cancellable: false }, async (progress) => {
            try {
                const eksik = await eksikPaketleriKontrolEt(rp, venvPython);
                if (eksik.length === 0) { vscode.window.showInformationMessage('✅ Tüm modüller kurulu!'); return; }
                const sec = await vscode.window.showWarningMessage(`📦 ${eksik.length} eksik modül: ${eksik.join(', ')}`, "Hepsini Kur", "İptal");
                if (sec === "Hepsini Kur") {
                    progress.report({ message: "Modüller kuruluyor..." });
                    await runCommand(`${pip} install ${eksik.join(' ')}`, rp);
                    const req = path.join(rp, 'requirements.txt');
                    let ri = fs.existsSync(req) ? fs.readFileSync(req, 'utf-8') : '';
                    eksik.forEach(p => { if (!ri.includes(p)) ri += `\n${p}`; });
                    fs.writeFileSync(req, ri.trim());
                    vscode.window.showInformationMessage(`✅ ${eksik.length} modül kuruldu!`);
                }
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Paket hatası: ${e.message}`); }
        });
    });

    // ==================== GÜVENLİK TARAMASI ====================
    const guvenlikKomutu = vscode.commands.registerCommand('pyotobaslat.guvenlikTaramasi', async () => {
        const w = vscode.workspace.workspaceFolders?.[0];
        if (!w) { vscode.window.showErrorMessage('❌ Python klasörü açın!'); return; }
        const rp = w.uri.fsPath, win = process.platform === 'win32';
        const pip = win ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip';
        const act = getActivateCmd(win); // 🆕 POSIX UYUMLU
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "🔒 Güvenlik taraması...", cancellable: false }, async (progress) => {
            try {
                try { await runCommand(`${pip} show pip-audit`, rp); } catch { progress.report({ message: "pip-audit kuruluyor..." }); await runCommand(`${pip} install pip-audit`, rp); }
                progress.report({ message: "Bağımlılıklar taranıyor..." });
                const term = getOrCreateTerminal('🔒 PyOtoBaşlat Güvenlik');
                term.sendText(`${act} && pip-audit --desc on`); term.show();
                vscode.window.showInformationMessage('🔒 Güvenlik taraması başladı!');
            } catch (e: any) { vscode.window.showErrorMessage(`❌ Güvenlik hatası: ${e.message}`); }
        });
    });

    const ayarlarKomutu = vscode.commands.registerCommand('pyotobaslat.ayarlarAc', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'pyotobaslat');
    });

    context.subscriptions.push(hazirlaKomutu, performansKomutu, paketGuncelleKomutu, guvenlikKomutu, ayarlarKomutu);
}

export function deactivate() {}
