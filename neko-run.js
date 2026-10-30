/* Neko Run — a Chrome-dino style pixel cat runner by the Nekomo community.
   Usage: <div data-neko-run data-prefix="myapp_" data-mode="embed|app"></div> + <script src="neko-run.js" defer></script>
   Keys: Space / Up / W jump (hold = higher) · Down / S duck · P pause · F full screen · M mute · Esc close settings. */
(function () {
    'use strict';

    var H = 150, GROUND = 128, PX = 2, CAT_X = 36;
    var STEP = 1000 / 60;
    var FONT = '"Press Start 2P", monospace';
    var AUTO_FS_FRAMES = 60 * 12;

    var DIFFICULTY = {
        easy: { label: 'Easy', start: 4.8, accel: 0.0009, max: 9.5, crowsAfter: 300, gapMul: 1.25 },
        normal: { label: 'Normal', start: 5.5, accel: 0.0014, max: 12, crowsAfter: 180, gapMul: 1 },
        hard: { label: 'Hard', start: 6.5, accel: 0.0022, max: 14, crowsAfter: 80, gapMul: 0.85 }
    };
    var SKINS = {
        white: { label: 'Snow', x: '#f7ecf0', e: '#0c0508', p: '#ff5c7a' },
        sakura: { label: 'Sakura', x: '#ffb3c2', e: '#3a0d1d', p: '#e5395f' },
        ginger: { label: 'Ginger', x: '#f2a65a', e: '#2a160c', p: '#ff7a95' },
        grey: { label: 'Smoke', x: '#a9a3b5', e: '#0c0508', p: '#ff7a95' },
        black: { label: 'Midnight', x: '#2e2430', e: '#ffd166', p: '#ff5c7a', outline: 'rgba(255,179,194,0.75)' }
    };
    var DEFAULTS = {
        sound: true, volume: 60, difficulty: 'normal', skin: 'white', sky: 'sakura',
        effects: true, autoFullscreen: true, touch: 'auto'
    };
    var BASE_PALETTE = {
        c: '#e5395f', y: '#ffd166', '*': '#ff5c7a',
        G: '#3f9e55', g: '#8fdc8a', s: '#7a4b2a', b: '#c9a3b1', f: '#ffd166', k: '#e0a63a',
        w: 'rgba(255,179,194,0.16)', W: '#f7ecf0'
    };

    var SPRITES = {
        run1: ['................x.....x.', '...............xpx...xpx', '..xx...........xxxxxxxxx', '.x..x..........xxxxxxxxx', '.x.............xxexxxexx', '.x.............xxxxpxxxx', '..x....xxxxxxxxxxxxxxxx.', '...xxxxxxxxxxxxcccycxx..', '....xxxxxxxxxxxxxxxxx...', '....xxxxxxxxxxxxxxxxx...', '....xxxxxxxxxxxxxxxx....', '....xx..xx.....xx..xx...', '...xx....xx...xx....xx..', '...x......x...x......x..'],
        run2: ['................x.....x.', '...............xpx...xpx', '..xx...........xxxxxxxxx', '.x..x..........xxxxxxxxx', '.x.............xxexxxexx', '.x.............xxxxpxxxx', '..x....xxxxxxxxxxxxxxxx.', '...xxxxxxxxxxxxcccycxx..', '....xxxxxxxxxxxxxxxxx...', '....xxxxxxxxxxxxxxxxx...', '....xxxxxxxxxxxxxxxx....', '.....xxxx.......xxxx....', '.....xxxx.......xxxx....', '......xx.........xx.....'],
        jump: ['................x.....x.', '...............xpx...xpx', '...............xxxxxxxxx', 'xx.............xxxxxxxxx', '..x............xxexxxexx', '..x............xxxxpxxxx', '..x....xxxxxxxxxxxxxxxx.', '...xxxxxxxxxxxxcccycxx..', '....xxxxxxxxxxxxxxxxxxx.', '....xxxxxxxxxxxxxxxx.xx.', '...xxxxxxxxxxxxxxxx.....', '..xx.xx.................', '.xx..x..................', '........................'],
        dead: ['................x.....x.', '...............xpx...xpx', '..xx...........xxxxxxxxx', '.x..x..........x*x*x*x*x', '.x.............xx*xxx*xx', '.x.............x*x*x*x*x', '..x....xxxxxxxxxxxxxpxxx', '...xxxxxxxxxxxxcccycxx..', '....xxxxxxxxxxxxxxxxx...', '....xxxxxxxxxxxxxxxxx...', '....xxxxxxxxxxxxxxxx....', '....xx..xx.....xx..xx...', '....xx..xx.....xx..xx...', '....xx..xx.....xx..xx...'],
        duck1: ['....................x....x..', '...................xpx..xpx.', 'xx.....xxxxxxxxxxxxxxxxxxxx.', '..xx.xxxxxxxxxxxxxxxexxxxex.', '....xxxxxxxxxxxxxxxxxxpxxxx.', '....xxxxxxxxxxxxxxcccycxx...', '....xxxxxxxxxxxxxxxxxxx.....', '....xx..xx......xx..xx......', '...xx....xx....xx....xx.....'],
        duck2: ['....................x....x..', '...................xpx..xpx.', 'xx.....xxxxxxxxxxxxxxxxxxxx.', '..xx.xxxxxxxxxxxxxxxexxxxex.', '....xxxxxxxxxxxxxxxxxxpxxxx.', '....xxxxxxxxxxxxxxcccycxx...', '....xxxxxxxxxxxxxxxxxxx.....', '.....xxxx........xxxx.......', '.....xxxx........xxxx.......'],
        crow1: ['.......b..........', '.......bb.........', '.......bbb........', '...bb..bbbb.......', '..bebbbbbbbbbbbb..', 'yybbbbbbbbbbbbbbbb', '....bbbbbbbbbbb...', '.......bbbbbb.....', '..................', '..................', '..................'],
        crow2: ['..................', '..................', '..................', '...bb.............', '..bebbbbbbbbbbbb..', 'yybbbbbbbbbbbbbbbb', '....bbbbbbbbbbb...', '.......bbbb.......', '.......bbb........', '.......bb.........', '.......b..........'],
        fish: ['...ffff....', '.ffffffff.f', 'fefffkffff.', 'ffffffkfff.', '.ffffffff.f', '...ffff....'],
        cloud: ['..........wwww..........', '.......wwwwwwwwww.......', '....wwwwwwwwwwwwwwww....', 'wwwwwwwwwwwwwwwwwwwwwwww'],
        retry: ['....WWWWWW.', '..WW......W', '.W.......WW', 'W.......WWW', 'W..........', 'W..........', 'W.........W', '.W.......W.', '..WW...WW..', '....WWW....'],
        moon: ['...WWWW...', '.WWWWWW...', 'WWWWWW....', 'WWWWW.....', 'WWWWW.....', 'WWWWWW....', '.WWWWWWW..', '...WWWW...']
    };
    var CAT_SPRITES = ['run1', 'run2', 'jump', 'dead', 'duck1', 'duck2'];

    function cucumber(w, h, seed) {
        var rows = [];
        for (var r = 0; r < h; r++) {
            var row = '';
            for (var c = 0; c < w; c++) {
                var edge = (r === 1 || r === h - 1) ? 2 : 1;
                var ch = '.';
                if (r === 0) ch = c === Math.floor(w / 2) ? 's' : '.';
                else if (c >= edge && c < w - edge) {
                    seed = (seed * 9301 + 49297) % 233280;
                    ch = (r > 1 && r < h - 2 && seed / 233280 < 0.13) ? 'g' : 'G';
                }
                row += ch;
            }
            rows.push(row);
        }
        return rows;
    }
    SPRITES.cuke1 = cucumber(7, 15, 3);
    SPRITES.cuke2 = cucumber(9, 22, 7);
    SPRITES.cuke3 = cucumber(7, 18, 11);

    function renderSprite(rows, palette, outline) {
        var w = 0;
        rows.forEach(function (r) { w = Math.max(w, r.length); });
        var pad = outline ? 1 : 0;
        var off = document.createElement('canvas');
        off.width = (w + pad * 2) * PX;
        off.height = (rows.length + pad * 2) * PX;
        var o = off.getContext('2d');
        function solid(x, y) { return y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && !!palette[rows[y][x]]; }
        if (outline) {
            o.fillStyle = outline;
            for (var oy = -1; oy <= rows.length; oy++) {
                for (var ox = -1; ox <= w; ox++) {
                    if (solid(ox, oy)) continue;
                    if (solid(ox - 1, oy) || solid(ox + 1, oy) || solid(ox, oy - 1) || solid(ox, oy + 1)) {
                        o.fillRect((ox + pad) * PX, (oy + pad) * PX, PX, PX);
                    }
                }
            }
        }
        rows.forEach(function (row, y) {
            for (var x = 0; x < row.length; x++) {
                var col = palette[row[x]];
                if (!col) continue;
                o.fillStyle = col;
                o.fillRect((x + pad) * PX, (y + pad) * PX, PX, PX);
            }
        });
        off.pad = pad * PX;
        return off;
    }

    var CSS = [
        '.nr-root{position:relative;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f7ecf0;-webkit-tap-highlight-color:transparent;}',
        '.nr-stage{position:relative;line-height:0;}',
        '.nr-canvas{display:block;width:100%;image-rendering:pixelated;image-rendering:crisp-edges;border-radius:10px;cursor:pointer;touch-action:manipulation;outline:none;user-select:none;-webkit-user-select:none;}',
        '.nr-canvas:focus-visible{box-shadow:0 0 0 2px #ff5c7a;}',
        '.nr-hud{position:absolute;top:8px;left:8px;display:flex;gap:6px;line-height:1;z-index:3;}',
        '.nr-icon{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:9px;cursor:pointer;border:1px solid rgba(255,92,122,.25);background:rgba(21,9,16,.72);color:#e7d3da;padding:0;transition:color .15s,border-color .15s,background .15s;}',
        '.nr-icon:hover{color:#fff;border-color:rgba(255,92,122,.55);}',
        '.nr-icon svg{width:16px;height:16px;}',
        '.nr-icon[hidden]{display:none;}',
        '.nr-touch{display:none;gap:10px;margin-top:12px;line-height:1;}',
        '.nr-root.nr-has-touch .nr-touch{display:flex;}',
        '.nr-touch button{flex:1;padding:14px;border-radius:12px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none;border:1px solid rgba(255,92,122,.25);background:rgba(255,92,122,.1);color:#f7ecf0;font:600 .95rem Outfit,Inter,system-ui,sans-serif;}',
        '.nr-touch button:active,.nr-touch button.nr-down{background:rgba(255,92,122,.3);}',
        '.nr-help{margin-top:10px;font-size:.8rem;line-height:1.6;color:#b9929f;text-align:center;}',
        '.nr-help kbd{font-family:inherit;font-size:.75rem;padding:1px 7px;border-radius:6px;border:1px solid rgba(255,92,122,.2);background:rgba(255,92,122,.08);color:#f7ecf0;}',
        '.nr-root.nr-has-touch .nr-help{display:none;}',
        /* full screen (native, pseudo for iPhone, or app mode) */
        '.nr-root.nr-full{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(229,57,95,.18),transparent 65%),#0c0508;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);}',
        '.nr-root.nr-full:fullscreen{position:static;}',
        '.nr-root.nr-full .nr-stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;}',
        '.nr-root.nr-full .nr-canvas{border-radius:0;}',
        '.nr-root.nr-full .nr-help{display:none;}',
        '.nr-root.nr-full.nr-has-touch .nr-touch{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));margin:0;flex-direction:column-reverse;gap:12px;z-index:3;}',
        '.nr-root.nr-full .nr-touch button{flex:none;width:76px;height:76px;padding:0;border-radius:50%;font-size:.8rem;background:rgba(255,92,122,.16);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}',
        '.nr-root.nr-full .nr-hud{top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));}',
        '.nr-root.nr-full .nr-icon{width:40px;height:40px;}',
        '.nr-root.nr-full .nr-icon svg{width:19px;height:19px;}',
        'html.nr-lock,html.nr-lock body{overflow:hidden !important;}',
        /* settings panel */
        '.nr-panel{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:10px;background:rgba(8,3,6,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);line-height:1.4;border-radius:10px;}',
        '.nr-panel[hidden]{display:none;}',
        '.nr-root.nr-embed:not(.nr-full) .nr-panel{position:absolute;inset:auto 0 auto 0;top:0;min-height:100%;align-items:flex-start;}',
        '.nr-card{width:100%;max-width:440px;max-height:100%;overflow:auto;background:#150910;border:1px solid rgba(255,92,122,.28);border-radius:16px;padding:16px 18px;text-align:left;box-shadow:0 20px 60px rgba(0,0,0,.55);}',
        '.nr-root.nr-full .nr-card{max-height:calc(100vh - 40px);}',
        '.nr-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}',
        '.nr-card h3{margin:0;font:700 1rem Outfit,Inter,system-ui,sans-serif;color:#f7ecf0;}',
        '.nr-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid rgba(255,92,122,.1);font-size:.85rem;color:#e7d3da;}',
        '.nr-row:first-of-type{border-top:none;}',
        '.nr-row small{display:block;color:#b9929f;font-size:.72rem;}',
        '.nr-switch{position:relative;width:40px;height:22px;flex-shrink:0;}',
        '.nr-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:1;}',
        '.nr-switch span{position:absolute;inset:0;background:rgba(255,92,122,.18);border:1px solid rgba(255,92,122,.3);border-radius:999px;transition:background .2s;}',
        '.nr-switch span::before{content:"";position:absolute;width:16px;height:16px;left:2px;top:2px;background:#f7ecf0;border-radius:50%;transition:transform .2s;}',
        '.nr-switch input:checked + span{background:linear-gradient(135deg,#ff5c7a,#8d2249);border-color:transparent;}',
        '.nr-switch input:checked + span::before{transform:translateX(18px);}',
        '.nr-switch input:focus-visible + span{box-shadow:0 0 0 2px #ff5c7a;}',
        '.nr-seg{display:inline-flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;}',
        '.nr-seg button{padding:5px 10px;border-radius:8px;cursor:pointer;border:1px solid rgba(255,92,122,.22);background:rgba(255,92,122,.06);color:#e7d3da;font:500 .78rem Inter,system-ui,sans-serif;}',
        '.nr-seg button[aria-pressed="true"]{background:linear-gradient(135deg,#ff5c7a,#8d2249);border-color:transparent;color:#fff;}',
        '.nr-swatch{width:26px;height:26px;padding:0 !important;border-radius:50% !important;}',
        '.nr-swatch[aria-pressed="true"]{box-shadow:0 0 0 2px #150910,0 0 0 4px #ff5c7a;background:var(--sw) !important;}',
        '.nr-range{width:130px;accent-color:#ff5c7a;}',
        '.nr-btn{padding:6px 12px;border-radius:9px;cursor:pointer;border:1px solid rgba(255,92,122,.3);background:rgba(255,92,122,.08);color:#f7ecf0;font:500 .78rem Inter,system-ui,sans-serif;}',
        '.nr-btn:hover{border-color:rgba(255,92,122,.6);}',
        '.nr-keys{margin-top:8px;font-size:.72rem;color:#b9929f;line-height:1.7;}',
        '.nr-keys kbd{font-family:inherit;padding:0 6px;border-radius:5px;border:1px solid rgba(255,92,122,.2);background:rgba(255,92,122,.08);color:#f7ecf0;}'
    ].join('\n');

    var ICONS = {
        gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        shrink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
        muted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
        pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
        play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    };

    var cssInjected = false;
    function injectCss() {
        if (cssInjected) return;
        cssInjected = true;
        var st = document.createElement('style');
        st.id = 'neko-run-styles';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    function store(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* storage blocked */ } }
    function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function pad5(n) { return ('00000' + n).slice(-5); }
    function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    function mount(host, opts) {
        if (!host || host.__nekoRun) return host && host.__nekoRun;
        opts = opts || {};
        injectCss();
        var prefix = opts.prefix || 'nekorun_';
        var appMode = opts.mode === 'app';
        var allowFs = opts.fullscreen !== false;
        var autoFsFrames = opts.autoFullscreenAfter > 0 ? Math.round(opts.autoFullscreenAfter * 60) : AUTO_FS_FRAMES;
        var onExit = opts.onExit;

        /* ---------- Settings ---------- */
        var settings = {};
        Object.keys(DEFAULTS).forEach(function (k) { settings[k] = DEFAULTS[k]; });
        var saved = null;
        try { saved = JSON.parse(load(prefix + 'settings') || 'null'); } catch (e) { saved = null; }
        if (saved) Object.keys(DEFAULTS).forEach(function (k) { if (k in saved) settings[k] = saved[k]; });
        else if (load(prefix + 'muted') === '1') settings.sound = false;
        if (!DIFFICULTY[settings.difficulty]) settings.difficulty = 'normal';
        if (!SKINS[settings.skin]) settings.skin = 'white';
        var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!saved && (load('nekomo_reduced_motion') === '1' || (load('nekomo_reduced_motion') === null && prefersReduced))) settings.effects = false;
        function saveSettings() { store(prefix + 'settings', JSON.stringify(settings)); }

        function hiKey(d) { return d === 'normal' ? prefix + 'highscore' : prefix + 'highscore_' + d; }
        function getHi(d) { return parseInt(load(hiKey(d)), 10) || 0; }

        /* ---------- DOM ---------- */
        host.innerHTML = '';
        var root = document.createElement('div');
        root.className = 'nr-root ' + (appMode ? 'nr-app nr-full' : 'nr-embed');
        root.innerHTML =
            '<div class="nr-stage">' +
            '  <canvas class="nr-canvas" tabindex="0" role="img" aria-label="Neko Run: a pixel cat running game. Press Space or tap to jump, Down arrow to duck."></canvas>' +
            '  <div class="nr-hud">' +
            '    <button type="button" class="nr-icon" data-act="settings" aria-label="Settings" title="Settings">' + ICONS.gear + '</button>' +
            '    <button type="button" class="nr-icon" data-act="pause" aria-label="Pause" title="Pause (P)">' + ICONS.pause + '</button>' +
            '    <button type="button" class="nr-icon" data-act="mute" aria-label="Mute" title="Sound (M)">' + ICONS.sound + '</button>' +
            '    <button type="button" class="nr-icon" data-act="fullscreen" aria-label="Full screen" title="Full screen (F)">' + ICONS.expand + '</button>' +
            (onExit ? '    <button type="button" class="nr-icon" data-act="exit" aria-label="Quit" title="Quit">' + ICONS.close + '</button>' : '') +
            '  </div>' +
            '  <div class="nr-touch">' +
            '    <button type="button" data-touch="jump" aria-label="Jump">&#9650; Jump</button>' +
            '    <button type="button" data-touch="duck" aria-label="Duck">&#9660; Duck</button>' +
            '  </div>' +
            '  <div class="nr-panel" hidden><div class="nr-card" role="dialog" aria-label="Neko Run settings"></div></div>' +
            '</div>' +
            '<div class="nr-help"><kbd>Space</kbd> / <kbd>&uarr;</kbd> jump &middot; <kbd>&darr;</kbd> duck &middot; <kbd>P</kbd> pause &middot; <kbd>F</kbd> full screen &middot; dodge cucumbers &amp; crows, grab fish</div>';
        host.appendChild(root);

        var stage = root.querySelector('.nr-stage');
        var canvas = root.querySelector('.nr-canvas');
        var ctx = canvas.getContext('2d');
        var panel = root.querySelector('.nr-panel');
        var card = root.querySelector('.nr-card');
        var btn = {};
        Array.prototype.forEach.call(root.querySelectorAll('[data-act]'), function (b) { btn[b.getAttribute('data-act')] = b; });
        if (!allowFs) btn.fullscreen.hidden = true;

        /* ---------- Sprites ---------- */
        var IMG = {};
        function buildSprites() {
            var skin = SKINS[settings.skin];
            var pal = {};
            Object.keys(BASE_PALETTE).forEach(function (k) { pal[k] = BASE_PALETTE[k]; });
            Object.keys(SPRITES).forEach(function (name) {
                if (CAT_SPRITES.indexOf(name) !== -1) return;
                IMG[name] = renderSprite(SPRITES[name], pal);
            });
            pal.x = skin.x; pal.e = skin.e; pal.p = skin.p;
            CAT_SPRITES.forEach(function (name) { IMG[name] = renderSprite(SPRITES[name], pal, skin.outline); });
        }
        buildSprites();

        /* ---------- Sound ---------- */
        var audio = null;
        function beep(freq, dur, type, slide) {
            if (!settings.sound || settings.volume <= 0) return;
            try {
                if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
                if (audio.state === 'suspended') audio.resume();
                var t = audio.currentTime;
                var osc = audio.createOscillator(), gain = audio.createGain();
                osc.type = type || 'square';
                osc.frequency.setValueAtTime(freq, t);
                if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
                gain.gain.setValueAtTime(0.09 * settings.volume / 100, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                osc.connect(gain); gain.connect(audio.destination);
                osc.start(t); osc.stop(t + dur);
            } catch (err) { /* audio unavailable */ }
        }
        var sfx = {
            jump: function () { beep(520, 0.12, 'square', 880); },
            point: function () { beep(880, 0.08); setTimeout(function () { beep(1320, 0.12); }, 80); },
            fish: function () { beep(990, 0.06, 'triangle'); setTimeout(function () { beep(1480, 0.1, 'triangle'); }, 60); },
            die: function () { beep(330, 0.25, 'sawtooth', 90); }
        };

        /* ---------- State ---------- */
        var W = 480;
        var state, cat, obstacles, fishes, clouds, petals, stars, specks, speed, distance, score, bonus, hi, flashUntil,
            overAt, nextMilestone, frame, runFrames, popups, newRecord, diff;
        var input = { jump: false, duck: false };
        var autoFsDone = false;

        function newPetal(x) { return { x: x, y: rand(-10, GROUND - 20), vx: rand(-0.6, -0.2), vy: rand(0.15, 0.45), ph: rand(0, 6.28) }; }
        function reset() {
            state = 'ready';
            diff = DIFFICULTY[settings.difficulty];
            hi = getHi(settings.difficulty);
            cat = { y: 0, vy: 0, ducking: false, grounded: true };
            obstacles = []; fishes = []; popups = [];
            speed = diff.start; distance = 0; score = 0; bonus = 0; flashUntil = 0; frame = 0; runFrames = 0;
            nextMilestone = 100; newRecord = false;
            seedScenery();
        }
        function seedScenery() {
            var span = Math.max(W, 900);
            clouds = [];
            for (var i = 0; i < Math.ceil(span / 160); i++) clouds.push({ x: rand(0, span), y: rand(12, 60), s: rand(0.15, 0.35) });
            petals = [];
            for (var j = 0; j < Math.ceil(span / 48); j++) petals.push(newPetal(rand(0, span)));
            stars = [];
            for (var s = 0; s < Math.ceil(span / 14); s++) stars.push({ x: rand(0, span), y: rand(4, GROUND - 30), t: rand(0, 6.28), b: Math.random() < 0.2 });
            specks = [];
            for (var k = 0; k < Math.ceil(span / 12); k++) specks.push({ x: rand(0, span), y: GROUND + rand(4, 18), w: Math.random() < 0.3 ? 4 : 2 });
        }

        function catSprite() {
            if (state === 'over') return IMG.dead;
            if (!cat.grounded) return IMG.jump;
            var alt = state === 'running' && Math.floor(frame / 6) % 2;
            if (cat.ducking) return alt ? IMG.duck2 : IMG.duck1;
            return alt ? IMG.run2 : IMG.run1;
        }
        function catBoxes() {
            var top = GROUND - cat.y;
            if (cat.ducking && cat.grounded) {
                var h = SPRITES.duck1.length * PX;
                return [{ x: CAT_X + 8, y: top - h + 6, w: 44, h: h - 8 }];
            }
            var sh = SPRITES.run1.length * PX;
            var y0 = top - sh;
            return [
                { x: CAT_X + 32, y: y0 + 4, w: 14, h: 12 },
                { x: CAT_X + 10, y: y0 + 14, w: 34, h: 10 },
                { x: CAT_X + 10, y: y0 + 22, w: 32, h: sh - 24 }
            ];
        }

        function spawnObstacle() {
            if (score > diff.crowsAfter && Math.random() < 0.3) {
                // y = sprite top; hitbox is the 8px body band 8px below. low = jump, mid = duck, high = harmless.
                var heights = [GROUND - 18, GROUND - 34, GROUND - 70];
                var img = IMG.crow1;
                obstacles.push({ type: 'crow', x: W + 10, y: heights[Math.floor(Math.random() * 3)], w: img.width, h: img.height, extra: rand(0.4, 1.2) });
                return;
            }
            var maxGroup = speed > 9 ? 3 : speed > 7 ? 2 : 1;
            var count = 1 + Math.floor(Math.random() * maxGroup);
            var x = W + 10;
            for (var i = 0; i < count; i++) {
                var im = IMG[['cuke1', 'cuke2', 'cuke3'][Math.floor(Math.random() * 3)]];
                obstacles.push({ type: 'cuke', img: im, x: x, y: GROUND - im.height + 2, w: im.width, h: im.height });
                x += im.width + 4;
            }
            if (Math.random() < 0.35) {
                var fi = IMG.fish;
                fishes.push({ x: x - (x - W) / 2 - fi.width / 2, y: GROUND - 70 - rand(0, 20), w: fi.width, h: fi.height, t: 0 });
            }
        }

        function start() {
            if (state === 'over') { if (performance.now() - overAt < 450) return; reset(); }
            if (state === 'paused') { resume(); return; }
            state = 'running';
            jump();
        }
        function jump() {
            if (state !== 'running' || !cat.grounded) return;
            cat.vy = 10.4; cat.grounded = false; cat.ducking = false;
            sfx.jump();
        }
        function pause() {
            if (state !== 'running') return;
            state = 'paused';
            input.jump = input.duck = false;
            updateButtons();
            draw();
        }
        function resume() {
            if (state !== 'paused' || !panel.hidden) return;
            state = 'running';
            lastT = 0;
            updateButtons();
        }

        function update() {
            frame++;
            var moving = state === 'running';
            if (state === 'paused') return;
            clouds.forEach(function (c) {
                c.x -= c.s * (moving ? speed / 6 : 0.3);
                if (c.x < -60) { c.x = W + rand(0, 80); c.y = rand(12, 60); }
            });
            petals.forEach(function (p, i) {
                p.ph += 0.05;
                p.x += p.vx - (moving ? speed * 0.15 : 0);
                p.y += p.vy;
                if (p.x < -6 || p.y > GROUND) petals[i] = newPetal(W + rand(0, 40));
            });
            stars.forEach(function (s) {
                s.t += 0.04;
                if (moving) { s.x -= speed * 0.04; if (s.x < -2) { s.x = W + rand(0, 20); s.y = rand(4, GROUND - 30); } }
            });
            if (!moving) return;

            runFrames++;
            speed = Math.min(diff.max, speed + diff.accel);
            distance += speed;
            var newScore = Math.floor(distance * 0.025) + bonus;
            if (newScore >= nextMilestone) {
                nextMilestone += 100;
                flashUntil = frame + 45;
                sfx.point();
            }
            score = newScore;

            if (cat.grounded) {
                cat.ducking = input.duck;
                if (input.jump) jump();
            } else {
                cat.vy -= input.duck ? 1.6 : 0.62;
                if (!input.jump && cat.vy > 4.5) cat.vy = 4.5;
                cat.y += cat.vy;
                if (cat.y <= 0) { cat.y = 0; cat.vy = 0; cat.grounded = true; cat.ducking = input.duck; }
            }

            specks.forEach(function (s) { s.x -= speed; if (s.x < -4) { s.x = W + rand(0, 20); s.y = GROUND + rand(4, 18); } });

            var last = obstacles[obstacles.length - 1];
            var gap = last ? (W - (last.x + last.w)) : Infinity;
            if (!last || gap > (last.gap || 0)) {
                if (!last || Math.random() < 0.06 || gap > 520) {
                    spawnObstacle();
                    obstacles[obstacles.length - 1].gap = (rand(200, 330) + speed * 14) * diff.gapMul;
                }
            }

            var boxes = catBoxes();
            for (var i = obstacles.length - 1; i >= 0; i--) {
                var o = obstacles[i];
                o.x -= speed + (o.type === 'crow' ? o.extra : 0);
                if (o.x + o.w < -10) { obstacles.splice(i, 1); continue; }
                var ob = o.type === 'crow'
                    ? { x: o.x + 2, y: o.y + 8, w: o.w - 4, h: 8 }
                    : { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 3 };
                for (var b = 0; b < boxes.length; b++) {
                    if (hit(boxes[b], ob)) { gameOver(); return; }
                }
            }
            for (var f = fishes.length - 1; f >= 0; f--) {
                var fi = fishes[f];
                fi.x -= speed; fi.t++;
                if (fi.x + fi.w < -10) { fishes.splice(f, 1); continue; }
                var fb = { x: fi.x, y: fi.y + Math.sin(fi.t / 8) * 3, w: fi.w, h: fi.h };
                for (var c = 0; c < boxes.length; c++) {
                    if (hit(boxes[c], fb)) {
                        bonus += 25;
                        popups.push({ x: fi.x, y: fb.y, t: 0 });
                        fishes.splice(f, 1);
                        sfx.fish();
                        break;
                    }
                }
            }
            popups.forEach(function (p) { p.t++; p.y -= 0.6; });
            popups = popups.filter(function (p) { return p.t < 40; });
        }

        function gameOver() {
            state = 'over';
            overAt = performance.now();
            input.jump = false;
            newRecord = score > hi;
            if (newRecord) { hi = score; store(hiKey(settings.difficulty), String(hi)); }
            sfx.die();
            updateButtons();
            draw();
        }

        /* ---------- Drawing ---------- */
        function text(str, x, y, size, color, align) {
            ctx.font = size + 'px ' + FONT;
            ctx.fillStyle = color;
            ctx.textAlign = align || 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(str, x, y);
        }
        function blit(img, x, y) { ctx.drawImage(img, Math.round(x) - (img.pad || 0), Math.round(y) - (img.pad || 0)); }

        function draw() {
            if (!state) return;
            ctx.clearRect(0, 0, W, H);
            var night = settings.sky === 'night';
            if (night) {
                var g = ctx.createLinearGradient(0, 0, 0, H);
                g.addColorStop(0, '#0a0d24'); g.addColorStop(1, '#1d1030');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, W, H);
                blit(IMG.moon, W - 70, 34);
            }
            if (settings.effects) {
                if (night) {
                    stars.forEach(function (s) {
                        if (s.x > W) return;
                        ctx.fillStyle = 'rgba(247,236,240,' + (0.35 + 0.35 * Math.sin(s.t)).toFixed(2) + ')';
                        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.b ? 2 : 1, s.b ? 2 : 1);
                    });
                }
                clouds.forEach(function (c) { if (c.x < W) blit(IMG.cloud, c.x, c.y); });
                ctx.fillStyle = 'rgba(255,122,149,0.75)';
                petals.forEach(function (p) {
                    if (p.x > W) return;
                    ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.sin(p.ph) > 0 ? 4 : 2, 2);
                });
            }

            ctx.fillStyle = 'rgba(247,236,240,0.55)';
            ctx.fillRect(0, GROUND, W, 2);
            ctx.fillStyle = 'rgba(185,146,159,0.45)';
            specks.forEach(function (s) { if (s.x < W) ctx.fillRect(Math.round(s.x), Math.round(s.y), s.w, 2); });

            fishes.forEach(function (f) { blit(IMG.fish, f.x, f.y + Math.sin(f.t / 8) * 3); });
            obstacles.forEach(function (o) {
                blit(o.type === 'crow' ? (Math.floor(frame / 10) % 2 ? IMG.crow2 : IMG.crow1) : o.img, o.x, o.y);
            });

            var spr = catSprite();
            blit(spr, CAT_X, GROUND - cat.y - (spr.height - 2 * (spr.pad || 0)) + 2);

            popups.forEach(function (p) {
                text('+25', Math.round(p.x), Math.round(p.y), 8, 'rgba(255,209,102,' + (1 - p.t / 40).toFixed(2) + ')');
            });

            var blink = frame < flashUntil && Math.floor(frame / 8) % 2 === 0;
            if (!blink) text(pad5(score), W - 10, 10, 10, '#f7ecf0', 'right');
            if (hi) text('HI ' + pad5(hi), W - 72, 10, 10, '#b9929f', 'right');
            if (diff !== DIFFICULTY.normal) text(diff.label.toUpperCase(), W - 10, 24, 6, '#b9929f', 'right');

            var tap = root.classList.contains('nr-has-touch');
            if (state === 'ready') {
                text('NEKO RUN', W / 2, 36, 16, '#ff5c7a', 'center');
                text(tap ? 'TAP TO START' : 'PRESS SPACE TO START', W / 2, 64, 8, '#f7ecf0', 'center');
            } else if (state === 'paused') {
                text('PAUSED', W / 2, 40, 16, '#ff5c7a', 'center');
                text(tap ? 'TAP TO CONTINUE' : 'SPACE / P TO CONTINUE', W / 2, 68, 8, '#f7ecf0', 'center');
            } else if (state === 'over') {
                text('MEOW OVER', W / 2, 30, 16, '#ff5c7a', 'center');
                text(newRecord ? 'NEW HIGH SCORE!' : (tap ? 'TAP' : 'SPACE') + ' TO TRY AGAIN', W / 2, 56, 8, '#f7ecf0', 'center');
                blit(IMG.retry, W / 2 - 11, 74);
            }
        }

        /* ---------- Layout & full screen ---------- */
        var pseudoFs = false;
        function nativeFsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
        function realFs() { return pseudoFs || nativeFsEl() === root; }
        function isFs() { return appMode || realFs(); }
        function canNativeFs() { return !!(root.requestFullscreen || root.webkitRequestFullscreen); }

        function enterFs() {
            if (!allowFs || realFs()) return;
            var wasRunning = state === 'running';
            var p = null;
            try {
                if (root.requestFullscreen) p = root.requestFullscreen({ navigationUI: 'hide' });
                else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
            } catch (e) { p = null; }
            if (!canNativeFs()) { if (appMode) return; setPseudo(true); }
            if (p && p.then) {
                p.then(function () {
                    if (screen.orientation && screen.orientation.lock && root.classList.contains('nr-has-touch')) {
                        screen.orientation.lock('landscape').catch(function () { });
                    }
                }, function () { if (!appMode) setPseudo(true); });
            }
            if (wasRunning) lastT = 0;
            canvas.focus({ preventScroll: true });
        }
        function exitFs() {
            if (pseudoFs) { setPseudo(false); return; }
            if (nativeFsEl() === root) {
                if (document.exitFullscreen) document.exitFullscreen().catch(function () { });
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            }
        }
        function setPseudo(on) {
            pseudoFs = on;
            document.documentElement.classList.toggle('nr-lock', on);
            layout();
        }
        function toggleFs() { if (realFs()) exitFs(); else enterFs(); }

        var dpr = 1;
        function layout() {
            var full = isFs();
            root.classList.toggle('nr-full', full);
            var cssW, cssH;
            if (full) {
                var sw = stage.clientWidth || window.innerWidth, sh = stage.clientHeight || window.innerHeight;
                W = clamp(Math.round(H * sw / Math.max(1, sh)), 320, 900);
                var s = Math.min(sw / W, sh / H);
                cssW = Math.floor(W * s); cssH = Math.floor(H * s);
                canvas.style.width = cssW + 'px';
            } else {
                cssW = stage.clientWidth || 480;
                W = cssW < 520 ? 320 : 480;
                cssH = Math.round(cssW * H / W);
                canvas.style.width = '100%';
            }
            canvas.style.height = cssH + 'px';
            dpr = Math.min(3, window.devicePixelRatio || 1);
            canvas.width = Math.max(1, Math.round(cssW * dpr));
            canvas.height = Math.max(1, Math.round(cssH * dpr));
            ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
            ctx.imageSmoothingEnabled = false;
            btn.fullscreen.innerHTML = realFs() ? ICONS.shrink : ICONS.expand;
            btn.fullscreen.setAttribute('aria-label', realFs() ? 'Exit full screen' : 'Full screen');
            if (appMode && !opts.desktop) btn.fullscreen.hidden = true;
            draw();
        }
        function onFsChange() {
            if (state === 'running' && !realFs()) pause();
            layout();
        }
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        window.addEventListener('resize', layout);
        if (window.ResizeObserver) new ResizeObserver(function () { layout(); }).observe(appMode ? root : host);

        function maybeAutoFs() {
            if (!allowFs || appMode || autoFsDone || !settings.autoFullscreen || isFs()) return;
            if (state === 'running' && runFrames >= autoFsFrames) { autoFsDone = true; enterFs(); }
        }

        /* ---------- Touch detection ---------- */
        var touchSeen = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        function applyTouch() {
            var on = settings.touch === 'on' || (settings.touch === 'auto' && touchSeen);
            root.classList.toggle('nr-has-touch', on);
        }
        window.addEventListener('touchstart', function () { if (!touchSeen) { touchSeen = true; applyTouch(); layout(); } }, { passive: true });

        /* ---------- Settings panel ---------- */
        function seg(name, options, current) {
            return '<div class="nr-seg" data-setting="' + name + '">' + options.map(function (o) {
                return '<button type="button" data-value="' + o[0] + '" aria-pressed="' + (String(current) === o[0]) + '">' + o[1] + '</button>';
            }).join('') + '</div>';
        }
        function sw(name, on) {
            return '<label class="nr-switch"><input type="checkbox" data-setting="' + name + '"' + (on ? ' checked' : '') + '><span></span></label>';
        }
        function renderPanel() {
            var skins = '<div class="nr-seg" data-setting="skin">' + Object.keys(SKINS).map(function (k) {
                return '<button type="button" class="nr-swatch" data-value="' + k + '" title="' + SKINS[k].label + '" aria-label="' + SKINS[k].label + ' cat" aria-pressed="' + (settings.skin === k) + '" style="--sw:' + SKINS[k].x + ';background:' + SKINS[k].x + '"></button>';
            }).join('') + '</div>';
            card.innerHTML =
                '<div class="nr-card-head"><h3>Neko Run settings</h3><button type="button" class="nr-icon" data-close aria-label="Close settings">' + ICONS.close + '</button></div>' +
                '<div class="nr-row"><span>Sound</span>' + sw('sound', settings.sound) + '</div>' +
                '<div class="nr-row"><span>Volume</span><input class="nr-range" type="range" min="0" max="100" step="5" value="' + settings.volume + '" data-setting="volume" aria-label="Volume"></div>' +
                '<div class="nr-row"><span>Difficulty<small>Starts with your next run</small></span>' + seg('difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], settings.difficulty) + '</div>' +
                '<div class="nr-row"><span>Cat</span>' + skins + '</div>' +
                '<div class="nr-row"><span>Sky</span>' + seg('sky', [['sakura', 'Sakura'], ['night', 'Night']], settings.sky) + '</div>' +
                '<div class="nr-row"><span>Clouds, petals &amp; stars</span>' + sw('effects', settings.effects) + '</div>' +
                (allowFs && !appMode ? '<div class="nr-row"><span>Auto full screen<small>After ~12 seconds of play</small></span>' + sw('autoFullscreen', settings.autoFullscreen) + '</div>' : '') +
                '<div class="nr-row"><span>Touch buttons</span>' + seg('touch', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']], settings.touch) + '</div>' +
                '<div class="nr-row"><span>Best<small>Easy ' + getHi('easy') + ' &middot; Normal ' + getHi('normal') + ' &middot; Hard ' + getHi('hard') + '</small></span><button type="button" class="nr-btn" data-reset>Reset</button></div>' +
                '<div class="nr-keys"><kbd>Space</kbd>/<kbd>&uarr;</kbd> jump (hold = higher) &middot; <kbd>&darr;</kbd> duck &middot; <kbd>P</kbd> pause &middot; <kbd>F</kbd> full screen &middot; <kbd>M</kbd> mute &middot; <kbd>Esc</kbd> close</div>';
        }
        function openPanel() {
            pause();
            renderPanel();
            panel.hidden = false;
            var first = card.querySelector('input,button:not([data-close])');
            if (first) first.focus({ preventScroll: true });
        }
        function closePanel() {
            if (panel.hidden) return;
            panel.hidden = true;
            canvas.focus({ preventScroll: true });
            draw();
        }
        function applySetting(name, value) {
            settings[name] = value;
            saveSettings();
            if (name === 'skin') buildSprites();
            if (name === 'difficulty' && state !== 'running' && state !== 'paused') reset();
            if (name === 'touch') { applyTouch(); layout(); }
            updateButtons();
            draw();
        }
        card.addEventListener('click', function (e) {
            var t = e.target.closest('button');
            if (!t) return;
            if (t.hasAttribute('data-close')) { closePanel(); return; }
            if (t.hasAttribute('data-reset')) {
                if (window.confirm('Reset all Neko Run high scores?')) {
                    Object.keys(DIFFICULTY).forEach(function (d) { try { localStorage.removeItem(hiKey(d)); } catch (err) { /* ignore */ } });
                    hi = 0;
                    renderPanel();
                    draw();
                }
                return;
            }
            var group = t.closest('[data-setting]');
            if (group && t.hasAttribute('data-value')) {
                applySetting(group.getAttribute('data-setting'), t.getAttribute('data-value'));
                Array.prototype.forEach.call(group.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b === t)); });
            }
        });
        card.addEventListener('change', function (e) {
            var t = e.target;
            var name = t.getAttribute('data-setting');
            if (!name) return;
            if (t.type === 'checkbox') applySetting(name, t.checked);
        });
        card.addEventListener('input', function (e) {
            var t = e.target;
            if (t.type === 'range') { applySetting('volume', parseInt(t.value, 10)); }
        });
        card.addEventListener('pointerup', function (e) {
            if (e.target.type === 'range') beep(660, 0.08);
        });
        panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });

        function updateButtons() {
            var mutedNow = !settings.sound || settings.volume <= 0;
            btn.mute.innerHTML = mutedNow ? ICONS.muted : ICONS.sound;
            btn.mute.setAttribute('aria-pressed', String(mutedNow));
            btn.mute.setAttribute('aria-label', mutedNow ? 'Unmute' : 'Mute');
            var paused = state === 'paused';
            btn.pause.innerHTML = paused ? ICONS.play : ICONS.pause;
            btn.pause.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
            btn.pause.hidden = !(state === 'running' || paused);
        }
        function toggleMute() {
            if (!settings.sound || settings.volume <= 0) { settings.sound = true; if (settings.volume <= 0) settings.volume = 60; }
            else settings.sound = false;
            saveSettings();
            updateButtons();
            if (!panel.hidden) renderPanel();
        }

        btn.settings.addEventListener('click', function () { if (panel.hidden) openPanel(); else closePanel(); });
        btn.pause.addEventListener('click', function () { if (state === 'paused') resume(); else pause(); canvas.focus({ preventScroll: true }); });
        btn.mute.addEventListener('click', function () { toggleMute(); canvas.focus({ preventScroll: true }); });
        btn.fullscreen.addEventListener('click', function () { toggleFs(); });
        if (btn.exit) btn.exit.addEventListener('click', function () { onExit(); });

        /* ---------- Input ---------- */
        function blocked(e) {
            var t = e.target;
            if (!panel.hidden) return true;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return true;
            if (t && /^(BUTTON|A)$/.test(t.tagName) && (e.code === 'Space' || e.code === 'Enter')) return true;
            return !!document.querySelector('.nk-gate-overlay, .nk-search-overlay.nk-open, .nk-wallpaper-overlay.nk-open');
        }
        function inView() {
            if (isFs()) return true;
            var r = canvas.getBoundingClientRect();
            return r.bottom > 0 && r.top < window.innerHeight;
        }
        function pressJump() {
            input.jump = true;
            if (state === 'running') jump(); else start();
            maybeAutoFs();
            updateButtons();
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (!panel.hidden) { closePanel(); e.preventDefault(); return; }
                if (pseudoFs) { setPseudo(false); return; }
            }
            if (e.ctrlKey || e.metaKey || e.altKey || blocked(e) || !inView()) return;
            var focused = document.activeElement === canvas || root.contains(document.activeElement);
            var arrow = e.code === 'ArrowUp' || e.code === 'ArrowDown';
            if (arrow && state !== 'running' && !focused && !isFs()) return;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                if (!e.repeat) pressJump();
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                e.preventDefault();
                input.duck = true;
                maybeAutoFs();
            } else if (e.code === 'KeyP') {
                if (state === 'running') pause(); else if (state === 'paused') resume();
            } else if (e.code === 'KeyF' && allowFs && (!appMode || opts.desktop)) {
                toggleFs();
            } else if (e.code === 'KeyM') {
                toggleMute();
            }
        });
        document.addEventListener('keyup', function (e) {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') input.jump = false;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') input.duck = false;
        });

        canvas.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'touch' && !touchSeen) { touchSeen = true; applyTouch(); layout(); }
            e.preventDefault();
            canvas.focus({ preventScroll: true });
            pressJump();
        });
        window.addEventListener('pointerup', function () { input.jump = false; });
        window.addEventListener('pointercancel', function () { input.jump = false; input.duck = false; });
        window.addEventListener('blur', function () { input.jump = input.duck = false; pause(); });
        document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

        Array.prototype.forEach.call(root.querySelectorAll('[data-touch]'), function (el) {
            var kind = el.getAttribute('data-touch');
            function down(e) {
                e.preventDefault();
                el.classList.add('nr-down');
                if (kind === 'jump') pressJump();
                else { input.duck = true; maybeAutoFs(); }
            }
            function up() {
                el.classList.remove('nr-down');
                if (kind === 'jump') input.jump = false; else input.duck = false;
            }
            el.addEventListener('pointerdown', down);
            ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, up); });
            el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        });

        /* ---------- Loop ---------- */
        var lastT = 0, acc = 0;
        function loop(t) {
            if (!lastT) lastT = t;
            acc += Math.min(100, t - lastT);
            lastT = t;
            while (acc >= STEP) {
                update();
                acc -= STEP;
                if (state === 'over') { acc = 0; break; }
            }
            if (state !== 'over' && state !== 'paused') draw();
            requestAnimationFrame(loop);
        }

        reset();
        applyTouch();
        updateButtons();
        layout();
        if (document.fonts && document.fonts.load) document.fonts.load('12px "Press Start 2P"').then(draw, draw);
        requestAnimationFrame(loop);

        var api = {
            /* Returns true if it handled the back action (closing settings / leaving full screen / pausing). */
            back: function () {
                if (!panel.hidden) { closePanel(); return true; }
                if (!appMode && isFs()) { exitFs(); return true; }
                if (state === 'running') { pause(); return true; }
                return false;
            },
            pause: pause,
            settings: settings,
            state: function () { return { state: state, score: score, fullscreen: realFs(), runSeconds: runFrames / 60 }; }
        };
        host.__nekoRun = api;
        return api;
    }

    window.NekoRun = { mount: mount };

    function autoMount() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-neko-run]'), function (el) {
            mount(el, {
                prefix: el.getAttribute('data-prefix') || undefined,
                mode: el.getAttribute('data-mode') || 'embed',
                fullscreen: el.getAttribute('data-fullscreen') !== 'off',
                desktop: el.getAttribute('data-desktop') === 'true'
            });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
})();
