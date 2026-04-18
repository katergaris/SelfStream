"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLandingPage = generateLandingPage;
const config_1 = require("./config");
function generateLandingPage(manifest, addonBase) {
    const langOptions = config_1.AVAILABLE_LANGUAGES.map(l => '<option value="' + l.code + '"' + (l.code === config_1.DEFAULT_CONFIG.vixLang ? ' selected' : '') + '>' + l.flag + ' ' + l.label + '</option>').join('\n');
    const addonBaseJson = JSON.stringify(addonBase);
    return '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>' + manifest.name + ' - Installation</title>' +
        '<link rel="icon" href="' + manifest.logo + '">' +
        '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">' +
        `<style>
:root{--primary:#ff6f3c;--primary-hover:#e55a26;--bg:#f7f3ea;--surface:rgba(255,255,255,.84);--surface-strong:rgba(255,255,255,.94);--border:rgba(27,38,44,.12);--text:#1b262c;--text-muted:#4f5f65;--accent:#006d77;--chip:#e8f4ef}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Space Grotesk',sans-serif;background:radial-gradient(circle at 20% 20%,#fdeccf 0,#f7f3ea 40%),radial-gradient(circle at 86% 86%,#cce3e7 0,#f7f3ea 32%),linear-gradient(120deg,#f7f3ea,#f5f9f8);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;overflow-x:hidden;padding:24px}
body:before,body:after{content:"";position:fixed;border-radius:50%;pointer-events:none;z-index:0}
body:before{width:320px;height:320px;top:-110px;right:-110px;background:rgba(255,111,60,.18);filter:blur(8px)}
body:after{width:280px;height:280px;bottom:-120px;left:-90px;background:rgba(0,109,119,.18);filter:blur(8px)}
.container{position:relative;z-index:1;width:100%;max-width:620px;animation:fadeIn .75s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.card{background:var(--surface);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:30px;padding:34px;box-shadow:0 22px 55px rgba(27,38,44,.12);text-align:center}
.logo{width:98px;height:98px;border-radius:22px;margin:0 auto 18px;display:block;box-shadow:0 10px 24px rgba(0,109,119,.25);border:2px solid rgba(255,255,255,.85)}
h1{font-family:'Syne',sans-serif;font-size:40px;font-weight:800;line-height:1;margin-bottom:10px;letter-spacing:.2px;color:#112027}
.version{font-size:12px;color:#07343a;background:var(--chip);padding:4px 12px;border-radius:999px;display:inline-block;margin-bottom:14px;font-weight:700;letter-spacing:.3px}
p.description{font-size:15px;color:var(--text-muted);line-height:1.5;margin:0 auto 28px;max-width:480px}
.button-group{display:flex;flex-direction:column;gap:16px}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 24px;border-radius:14px;font-size:15px;font-weight:700;text-decoration:none;transition:all .25s ease;cursor:pointer;border:none;width:100%;font-family:'Space Grotesk',sans-serif}
.btn-primary{background:linear-gradient(120deg,var(--primary),#ff8b5f);color:#fff;box-shadow:0 10px 20px rgba(255,111,60,.28)}
.btn-primary:hover{background:linear-gradient(120deg,var(--primary-hover),#ff7644);transform:translateY(-2px)}
.btn-secondary{background:var(--surface-strong);color:#15343b;border:1px solid var(--border)}
.btn-secondary:hover{background:#fff;transform:translateY(-2px)}
.custom-kofi-union{background:linear-gradient(120deg,var(--accent),#0f8f9a);color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:10px;transition:transform .2s;font-weight:700}
.custom-kofi-union:hover{transform:translateY(-2px)}
.custom-kofi-union img{height:24px}
.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(100px);background:rgba(0,109,119,.92);color:#fff;padding:10px 24px;border-radius:999px;font-weight:700;transition:transform .3s ease-out;z-index:1000;backdrop-filter:blur(6px)}
.toast.show{transform:translateX(-50%) translateY(0)}
.config-section{margin-bottom:28px;text-align:left}
.config-section h2{font-family:'Syne',sans-serif;font-size:22px;margin-bottom:16px;color:#16363d;text-align:center;letter-spacing:.2px}
.source-row{background:var(--surface-strong);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px;transition:all .3s ease}
.source-row.disabled{opacity:.5}
.source-header{display:flex;align-items:center;justify-content:space-between}
.source-label{font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px}
.source-badge{font-size:11px;padding:2px 8px;border-radius:8px;background:#edf5f3;color:#2e6168;font-weight:600}
.toggle{position:relative;width:48px;height:26px;flex-shrink:0}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#d5dfe1;border-radius:26px;transition:.3s}
.toggle-slider:before{content:"";position:absolute;height:20px;width:20px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.3s}
.toggle input:checked+.toggle-slider{background:var(--primary)}
.toggle input:checked+.toggle-slider:before{transform:translateX(22px)}
.source-options{margin-top:12px;overflow:hidden;max-height:0;transition:max-height .3s ease}
.source-row.enabled .source-options{max-height:80px}
.lang-select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:#fff;color:#1f2d32;font-size:14px;font-family:'Space Grotesk',sans-serif;appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2315333a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");background-repeat:no-repeat;background-position:right 10px center;background-size:16px}
.lang-select option{background:#fff;color:#1f2d32}
.text-input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:#fff;color:#1f2d32;font-size:14px;font-family:'Space Grotesk',sans-serif}
.text-input::placeholder{color:#8ba0a5}
@media(max-width:480px){.card{padding:26px 16px}h1{font-size:34px}.source-label{font-size:14px}}
</style>
</head>
<body>
<div class="container">
<div class="card">
` +
        '<img src="' + manifest.logo + '" alt="Logo" class="logo">' +
        '<h1>' + manifest.name + '</h1>' +
        '<span class="version">v' + manifest.version + '</span>' +
        '<p class="description">' + manifest.description + '</p>' +
        `
<div class="config-section">
<h2>GeniuStream Control Room</h2>

<div class="source-row enabled" id="vix-row">
    <div class="source-header">
        <span class="source-label">📺 ViX <span class="source-badge">Multi-language</span></span>
        <label class="toggle"><input type="checkbox" id="vixEnabled" checked onchange="toggleSource('vix')"><span class="toggle-slider"></span></label>
    </div>
    <div class="source-options">
        <select id="vixLang" class="lang-select">` + langOptions + `</select>
    </div>
</div>

<div class="source-row enabled" id="cinemacity-row">
    <div class="source-header">
        <span class="source-label">🎬 CinemaCity <span class="source-badge">Multi-language</span></span>
        <label class="toggle"><input type="checkbox" id="cinemacityEnabled" checked onchange="toggleSource('cinemacity')"><span class="toggle-slider"></span></label>
    </div>
    <div class="source-options">
        <select id="cinemacityLang" class="lang-select">` + langOptions + `</select>
    </div>
</div>

<div class="source-row disabled" id="altadefinizione-row">
    <div class="source-header">
        <span class="source-label">🍿 Altadefinizione <span class="source-badge">Movie source</span></span>
        <label class="toggle"><input type="checkbox" id="altadefinizioneEnabled" onchange="toggleSource('altadefinizione')"><span class="toggle-slider"></span></label>
    </div>
</div>

<div class="source-row disabled" id="cb01-row">
    <div class="source-header">
        <span class="source-label">📽️ CB01 <span class="source-badge">Movie source</span></span>
        <label class="toggle"><input type="checkbox" id="cb01Enabled" onchange="toggleSource('cb01')"><span class="toggle-slider"></span></label>
    </div>
</div>

<div class="source-row disabled" id="external-row">
    <div class="source-header">
        <span class="source-label">🧩 External Addon <span class="source-badge">MammaMia or any Stremio stream addon</span></span>
        <label class="toggle"><input type="checkbox" id="externalEnabled" onchange="toggleSource('external')"><span class="toggle-slider"></span></label>
    </div>
    <div class="source-options">
        <input id="externalAddonUrl" class="text-input" placeholder="https://your-addon/manifest.json">
    </div>
</div>
</div>

<div class="button-group">
    <a href="#" class="btn btn-primary" id="install_button">Install GeniuStream</a>
    <a href="https://ko-fi.com/G2G41MG3ZN" target="_blank" class="custom-kofi-union">
        <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi"><span>Buy us a beer 🍻</span>
    </a>
    <button class="btn btn-secondary" onclick="copyManifest()">Copy Manifest Link</button>
</div>
</div>
</div>

<div id="toast" class="toast">Link copied!</div>

<script>
var ADDON_BASE = ` + addonBaseJson + `;

function getConfig(){
    return {
        vixEnabled: document.getElementById('vixEnabled').checked,
        vixLang: document.getElementById('vixLang').value,
        cinemacityEnabled: document.getElementById('cinemacityEnabled').checked,
        cinemacityLang: document.getElementById('cinemacityLang').value,
        altadefinizioneEnabled: document.getElementById('altadefinizioneEnabled').checked,
        cb01Enabled: document.getElementById('cb01Enabled').checked,
        externalEnabled: document.getElementById('externalEnabled').checked,
        externalAddonUrl: document.getElementById('externalAddonUrl').value.trim()
    };
}

function encodeConfig(cfg){
    var s = JSON.stringify(cfg);
    return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/g,'');
}

function getManifestUrl(){
    return ADDON_BASE + '/' + encodeConfig(getConfig()) + '/manifest.json';
}

function toggleSource(name){
    var rowId = name + '-row';
    if(name==='vix') rowId = 'vix-row';
    var row = document.getElementById(rowId);
    var cbId = name + 'Enabled';
    if(name==='vix') cbId = 'vixEnabled';
    var cb = document.getElementById(cbId);
    if(cb.checked){ row.classList.remove('disabled'); row.classList.add('enabled'); }
    else { row.classList.remove('enabled'); row.classList.add('disabled'); }
}

function showToast(msg){
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, 2000);
}

document.getElementById('install_button').addEventListener('click', function(e){
    e.preventDefault();
    var url = getManifestUrl();
    window.location.href = 'stremio://' + url.replace(/^https?:\\/\\//, '');
});

function copyManifest(){
    var url = getManifestUrl();
    navigator.clipboard.writeText(url).then(function(){ showToast('Link copied to clipboard!'); });
}
</script>
</body>
</html>`;
}
//# sourceMappingURL=landing.js.map