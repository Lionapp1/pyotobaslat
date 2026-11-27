function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function jsonForScript(value: unknown): string {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

const BASE_STYLE = `
body{font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
h2{color:var(--vscode-textLink-foreground)}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:15px}
th{background:var(--vscode-editorGroupHeader-tabsBackground);padding:10px;text-align:left;cursor:pointer;position:sticky;top:0;user-select:none}
th:hover{background:var(--vscode-list-hoverBackground)}
td{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border)}
tr:hover{background:var(--vscode-list-hoverBackground)}
.info{margin-bottom:15px;padding:10px;background:var(--vscode-textBlockQuote-background);border-left:3px solid var(--vscode-textLink-foreground);border-radius:4px}
`;

function document(title: string, body: string): string {
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<title>${escapeHtml(title)}</title><style>${BASE_STYLE}</style></head><body>${body}</body></html>`;
}

interface ProfileRow {
    ncalls: string;
    tottime: number;
    percall: number;
    cumtime: number;
    filename: string;
}

export function parseProfile(text: string): ProfileRow[] {
    const rows: ProfileRow[] = [];
    const pattern = /^\s*(\d+(?:\/\d+)?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(?:([\d.]+)\s+)?(.+)$/;
    for (const line of text.split(/\r?\n/)) {
        const match = line.match(pattern);
        if (!match) { continue; }
        rows.push({
            ncalls: match[1],
            tottime: Number(match[2]),
            percall: Number(match[3]),
            cumtime: Number(match[4]),
            filename: match[6].trim()
        });
    }
    return rows;
}

export function performanceHtml(profileText: string): string {
    const rows = parseProfile(profileText);
    const body = `<h2>⚡ Performans Analizi</h2>
<div class="info">Sütun başlıklarına tıklayarak sıralama yapabilirsiniz.</div>
<table><thead><tr>
<th onclick="sortBy(0)">📞 Çağrı</th>
<th onclick="sortBy(1)">⏱️ Toplam (s)</th>
<th onclick="sortBy(2)">📊 Çağrı Başı (s)</th>
<th onclick="sortBy(3)">📈 Kümülatif (s)</th>
<th>📄 Dosya / Fonksiyon</th>
</tr></thead><tbody id="rows"></tbody></table>
<script>
const rows = ${jsonForScript(rows)};
let column = 3, ascending = false;
function render() {
    const sorted = rows.slice().sort(function (a, b) {
        const keys = ['ncalls', 'tottime', 'percall', 'cumtime'];
        const key = keys[column];
        const left = key === 'ncalls' ? Number(a.ncalls.split('/')[0]) : a[key];
        const right = key === 'ncalls' ? Number(b.ncalls.split('/')[0]) : b[key];
        if (left === right) { return 0; }
        return (left < right ? -1 : 1) * (ascending ? 1 : -1);
    });
    const max = Math.max.apply(null, rows.map(function (r) { return r.cumtime; }).concat([0.001]));
    document.getElementById('rows').innerHTML = sorted.map(function (r) {
        const width = (r.cumtime / max * 100).toFixed(1);
        const slow = r.tottime > 0.1 ? ' style="color:var(--vscode-errorForeground);font-weight:bold"' : '';
        return '<tr><td>' + r.ncalls + '</td><td' + slow + '>' + r.tottime.toFixed(4) +
            '</td><td>' + r.percall.toFixed(4) + '</td><td>' + r.cumtime.toFixed(4) +
            '<div style="height:6px;background:var(--vscode-progressBar-background);border-radius:3px;margin-top:4px;width:' + width + '%"></div>' +
            '</td><td>' + r.filename.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</td></tr>';
    }).join('');
}
function sortBy(index) {
    if (index === column) { ascending = !ascending; } else { column = index; ascending = false; }
    render();
}
render();
</script>`;
    return document('Performans Raporu', body);
}

export interface ErrorStat {
    errorType: string;
    count: number;
    lastDate: string;
    project: string;
}

export function statisticsHtml(stats: ErrorStat[]): string {
    const sorted = [...stats].sort((a, b) => b.count - a.count);
    const table = sorted.length === 0
        ? '<p>🎉 Henüz kaydedilmiş hata yok!</p>'
        : '<table><thead><tr><th>Hata Türü</th><th>Sayı</th><th>Son Tarih</th><th>Proje</th></tr></thead><tbody>' +
        sorted.map(stat => `<tr><td>${escapeHtml(stat.errorType)}</td><td>${stat.count}</td><td>${escapeHtml(stat.lastDate)}</td><td>${escapeHtml(stat.project)}</td></tr>`).join('') +
        '</tbody></table>';
    return document('Hata İstatistikleri', `<h2>📊 Hata İstatistikleri</h2>
<div class="info">Veriler yalnızca yerel olarak saklanır.</div>${table}`);
}

export interface HealthItem {
    category: string;
    status: 'ok' | 'warning' | 'error' | 'info';
    message: string;
}

export function healthHtml(items: HealthItem[]): string {
    const icons: Record<HealthItem['status'], string> = { ok: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
    const colors: Record<HealthItem['status'], string> = {
        ok: '#4caf50', warning: '#ff9800', error: '#f44336', info: '#007acc'
    };
    const rows = items.map(item => `<div style="padding:12px;margin:8px 0;border-radius:6px;border-left:4px solid ${colors[item.status]};background:rgba(0,0,0,0.04)">
<span>${icons[item.status]}</span><strong style="min-width:160px;display:inline-block">${escapeHtml(item.category)}</strong><span>${escapeHtml(item.message)}</span></div>`).join('');
    return document('Proje Sağlık Raporu', `<h2>🏥 Proje Sağlık Raporu</h2>${rows}`);
}
