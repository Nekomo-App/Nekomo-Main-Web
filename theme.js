/* Nekomo theme extras — falling sakura petals + a small settings panel.
   Include with: <script src="theme.js" defer></script> (after gate.js) */
(function () {
    var PETALS_KEY = 'nekomo_petals';
    var MOTION_KEY = 'nekomo_reduced_motion';
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getPetalsEnabled() {
        var v = localStorage.getItem(PETALS_KEY);
        return v === null ? !prefersReducedMotion : v === '1';
    }
    function getReducedMotion() {
        var v = localStorage.getItem(MOTION_KEY);
        return v === null ? prefersReducedMotion : v === '1';
    }

    /* ---------- Background music prefs (off by default) ---------- */
    var MUSIC_ENABLED_KEY = 'nekomo_music_enabled';
    var MUSIC_VOLUME_KEY = 'nekomo_music_volume';
    var MUSIC_URL_KEY = 'nekomo_music_url';
    var DEFAULT_MUSIC_URL = 'https://www.youtube.com/watch?v=I-AyVc3Vi9Y';

    function getMusicEnabled() { return localStorage.getItem(MUSIC_ENABLED_KEY) === '1'; }
    function getMusicVolume() {
        var v = parseInt(localStorage.getItem(MUSIC_VOLUME_KEY), 10);
        return isNaN(v) ? 40 : Math.min(100, Math.max(0, v));
    }
    function getMusicUrl() { return localStorage.getItem(MUSIC_URL_KEY) || DEFAULT_MUSIC_URL; }
    function extractYouTubeId(url) {
        if (!url) return null;
        var m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|[?&]v=)([a-zA-Z0-9_-]{11})/);
        return m ? m[1] : null;
    }

    var css = [
        '.nk-petal-layer{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden;}',
        '.nk-petal{position:absolute;top:-5vh;font-size:1.1rem;opacity:.75;will-change:transform,opacity;animation:nk-fall ease-in-out forwards;filter:drop-shadow(0 0 4px rgba(255,92,122,.3));cursor:pointer;pointer-events:auto;transition:filter .15s,transform .15s;}',
        '.nk-petal:hover{filter:drop-shadow(0 0 10px rgba(255,92,122,.7)) brightness(1.25);transform:scale(1.25) rotate(var(--nk-spin));}',
        '.nk-petal.nk-popped{animation:none !important;transition:transform .28s cubic-bezier(.2,.8,.4,1.4),opacity .28s ease;transform:scale(1.8) rotate(45deg) !important;opacity:0 !important;pointer-events:none;}',
        '@keyframes nk-fall{0%{transform:translate(0,0) rotate(0deg);}20%{transform:translate(var(--nk-drift-a),20vh) rotate(calc(var(--nk-spin) * .2));}45%{transform:translate(var(--nk-drift-b),45vh) rotate(calc(var(--nk-spin) * .45));}70%{transform:translate(var(--nk-drift-a),70vh) rotate(calc(var(--nk-spin) * .7));}100%{transform:translate(var(--nk-drift-c),112vh) rotate(var(--nk-spin));}}',
        '.nk-burst-particle{position:fixed;z-index:3;pointer-events:none;will-change:transform,opacity;animation:nk-burst .55s cubic-bezier(.2,.7,.3,1) forwards;}',
        '@keyframes nk-burst{0%{transform:translate(0,0) scale(1) rotate(0deg);opacity:1;}100%{transform:translate(var(--nk-bx),var(--nk-by)) scale(.35) rotate(var(--nk-br));opacity:0;}}',
        '.nk-skip-link{position:fixed;top:-60px;left:12px;z-index:10000;background:#150910;color:#f7ecf0;padding:10px 18px;border-radius:10px;border:1px solid rgba(255,92,122,.3);text-decoration:none;font-family:Inter,system-ui,sans-serif;font-size:.85rem;font-weight:600;transition:top .2s;}',
        '.nk-skip-link:focus{top:12px;outline:none;}',
        '.nk-settings-btn{position:fixed;bottom:22px;right:22px;z-index:200;width:48px;height:48px;border-radius:50%;background:#150910;border:1px solid rgba(255,92,122,.3);color:#ff5c7a;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4);transition:transform .2s,border-color .2s;}',
        '.nk-settings-btn:hover{border-color:rgba(255,92,122,.6);transform:rotate(35deg);}',
        '.nk-settings-btn svg{width:22px;height:22px;}',
        '.nk-settings-panel{position:fixed;bottom:80px;right:22px;z-index:200;width:260px;background:#150910;border:1px solid rgba(255,92,122,.25);border-radius:16px;padding:18px;color:#f7ecf0;font-family:Inter,system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5);opacity:0;transform:translateY(8px) scale(.97);pointer-events:none;transition:opacity .18s,transform .18s;}',
        '.nk-settings-panel.nk-open{opacity:1;transform:none;pointer-events:auto;}',
        '.nk-settings-panel h3{font-family:Outfit,sans-serif;font-size:.95rem;font-weight:700;margin-bottom:12px;}',
        '.nk-settings-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;font-size:.85rem;color:#e7d3da;}',
        '.nk-switch{position:relative;width:38px;height:22px;flex-shrink:0;}',
        '.nk-switch input{opacity:0;width:0;height:0;}',
        '.nk-switch span{position:absolute;inset:0;background:rgba(255,92,122,.18);border:1px solid rgba(255,92,122,.3);border-radius:999px;cursor:pointer;transition:background .2s;}',
        '.nk-switch span::before{content:"";position:absolute;width:16px;height:16px;left:2px;top:2px;background:#f7ecf0;border-radius:50%;transition:transform .2s;}',
        '.nk-switch input:checked + span{background:linear-gradient(135deg,#ff5c7a,#8d2249);border-color:transparent;}',
        '.nk-switch input:checked + span::before{transform:translateX(16px);}',
        '.nk-music-controls{margin-top:4px;padding-top:10px;border-top:1px solid rgba(255,92,122,.12);display:flex;flex-direction:column;gap:10px;}',
        '.nk-music-row{display:flex;align-items:center;gap:10px;}',
        '.nk-music-btn{flex-shrink:0;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,92,122,.3);background:rgba(255,92,122,.08);color:#ff5c7a;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s;}',
        '.nk-music-btn:hover{background:rgba(255,92,122,.18);}',
        '.nk-music-btn svg{width:15px;height:15px;}',
        '.nk-music-row input[type=range]{flex:1;accent-color:#ff5c7a;}',
        '.nk-music-url-row{display:flex;gap:8px;}',
        '.nk-music-url-row input[type=text]{flex:1;min-width:0;background:rgba(255,92,122,.06);border:1px solid rgba(255,92,122,.2);border-radius:8px;padding:7px 10px;color:#f7ecf0;font-size:.76rem;font-family:inherit;}',
        '.nk-music-url-row input[type=text]:focus{outline:none;border-color:rgba(255,92,122,.5);}',
        '.nk-music-apply{flex-shrink:0;padding:0 12px;border-radius:8px;border:none;background:linear-gradient(135deg,#ff5c7a,#8d2249);color:#fff;font-size:.76rem;font-weight:600;cursor:pointer;}',
        '.nk-music-note{font-size:.68rem;color:#b9929f;line-height:1.5;}',
        '.nk-music-note a{color:#ff5c7a;}',
        '.nk-music-status{font-size:.7rem;color:#ff7a95;min-height:1em;}',
        '@media (max-width:480px){.nk-settings-panel{right:14px;width:calc(100vw - 28px);}.nk-settings-btn{right:14px;}}',
        '@media (max-width:640px){footer{padding-bottom:92px;}}',
        '.nk-reduced-motion *,.nk-reduced-motion *::before,.nk-reduced-motion *::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;scroll-behavior:auto !important;}',
        '.nk-wallpaper-overlay{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:28px;background:rgba(8,3,6,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .2s;}',
        '.nk-wallpaper-overlay.nk-open{opacity:1;pointer-events:auto;}',
        '.nk-wallpaper-card{position:relative;max-width:min(1100px,92vw);display:flex;flex-direction:column;align-items:center;gap:16px;}',
        '.nk-wallpaper-card img{max-width:100%;max-height:70vh;border-radius:16px;border:1px solid rgba(255,92,122,.25);box-shadow:0 24px 80px rgba(0,0,0,.6);object-fit:contain;}',
        '.nk-wallpaper-caption{font-family:Inter,system-ui,sans-serif;font-size:.85rem;color:#b9929f;text-align:center;}',
        '.nk-wallpaper-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;}',
        '.nk-wallpaper-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:12px;font-family:Outfit,sans-serif;font-size:.9rem;font-weight:600;text-decoration:none;cursor:pointer;border:none;transition:filter .2s;}',
        '.nk-wallpaper-btn svg{width:18px;height:18px;}',
        '.nk-wallpaper-btn.nk-primary{background:linear-gradient(135deg,#ff5c7a,#8d2249);color:#fff;}',
        '.nk-wallpaper-btn.nk-primary:hover{filter:brightness(1.12);}',
        '.nk-wallpaper-btn.nk-ghost{background:rgba(255,92,122,.08);border:1px solid rgba(255,92,122,.25);color:#f7ecf0;}',
        '.nk-wallpaper-btn.nk-ghost:hover{background:rgba(255,92,122,.15);}',
        '.nk-wallpaper-close{position:absolute;top:-18px;right:-18px;width:36px;height:36px;border-radius:50%;background:#150910;border:1px solid rgba(255,92,122,.3);color:#f7ecf0;display:flex;align-items:center;justify-content:center;cursor:pointer;}',
        '.nk-wallpaper-close svg{width:16px;height:16px;}',
        '@media (max-width:480px){.nk-wallpaper-close{top:-14px;right:4px;}}',
        '.nav-links a{white-space:nowrap;}',
        '.nav-links a.nav-cta{background:linear-gradient(135deg,#ff5c7a,#8d2249);color:#fff;font-weight:600;}',
        '.nav-links a.nav-cta:hover{filter:brightness(1.15);}',
        '.nav-links a.nk-current,.nk-dd-btn.nk-current{color:#f7ecf0;background:rgba(255,92,122,.12);}',
        '.nk-dd{position:relative;}',
        '.nk-dd-btn{font:inherit;font-size:.92rem;font-weight:500;color:#b9929f;background:none;border:none;cursor:pointer;padding:8px 14px;border-radius:10px;white-space:nowrap;transition:color .2s,background .2s;}',
        '.nk-dd-btn:hover,.nk-dd.nk-open .nk-dd-btn{color:#f7ecf0;background:rgba(255,92,122,.08);}',
        '.nk-dd-menu{position:absolute;top:100%;right:0;min-width:210px;padding:8px;margin-top:6px;display:none;flex-direction:column;gap:2px;background:rgba(12,5,8,.97);border:1px solid rgba(255,92,122,.14);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.5);}',
        '.nk-dd-menu::before{content:"";position:absolute;left:0;right:0;top:-8px;height:8px;}',
        '.nk-dd:hover .nk-dd-menu,.nk-dd:focus-within .nk-dd-menu,.nk-dd.nk-open .nk-dd-menu{display:flex;}',
        '@media (max-width:1240px){.nk-dd-btn{display:none;}.nk-dd-menu{position:static;display:flex;margin:0;padding:0;border:none;box-shadow:none;background:none;}.nk-dd-menu::before{display:none;}}',
        '@media (max-width:1240px){.nav-links{background:#110609;max-height:calc(100vh - 84px);max-height:calc(100dvh - 84px);overflow-y:auto;overscroll-behavior:contain;gap:2px;}.nav-links a{padding:10px 14px;}.nk-dd{margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,92,122,.12);}.nav-links .nav-cta{margin-top:6px;text-align:center;}}',
        '.nk-search-btn{position:fixed;bottom:22px;right:84px;z-index:200;width:48px;height:48px;border-radius:50%;background:#150910;border:1px solid rgba(255,92,122,.3);color:#ff5c7a;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4);transition:transform .2s,border-color .2s;}',
        '.nk-search-btn:hover{border-color:rgba(255,92,122,.6);transform:scale(1.06);}',
        '.nk-search-btn svg{width:20px;height:20px;}',
        '@media (max-width:480px){.nk-search-btn{right:14px;bottom:80px;}.nk-settings-btn{right:14px;}}',
        '.nk-search-overlay{position:fixed;inset:0;z-index:9997;display:flex;align-items:flex-start;justify-content:center;padding:14vh 20px 20px;background:rgba(8,3,6,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .18s;}',
        '.nk-search-overlay.nk-open{opacity:1;pointer-events:auto;}',
        '.nk-search-card{width:100%;max-width:560px;max-height:70vh;display:flex;flex-direction:column;background:#150910;border:1px solid rgba(255,92,122,.25);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.6);overflow:hidden;transform:translateY(-10px) scale(.98);transition:transform .18s;}',
        '.nk-search-overlay.nk-open .nk-search-card{transform:none;}',
        '.nk-search-input-row{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(255,92,122,.12);}',
        '.nk-search-input-row svg{width:18px;height:18px;color:#ff5c7a;flex-shrink:0;}',
        '.nk-search-input-row input{flex:1;min-width:0;background:none;border:none;color:#f7ecf0;font-size:1rem;font-family:Inter,system-ui,sans-serif;}',
        '.nk-search-input-row input:focus{outline:none;}',
        '.nk-search-input-row kbd{font-size:.72rem;color:#b9929f;border:1px solid rgba(255,92,122,.25);border-radius:6px;padding:2px 6px;font-family:inherit;}',
        '.nk-search-chips{display:flex;gap:6px;padding:10px 18px;flex-wrap:wrap;border-bottom:1px solid rgba(255,92,122,.1);}',
        '.nk-search-chip{font:inherit;font-size:.74rem;font-weight:500;padding:5px 11px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,92,122,.2);background:rgba(255,92,122,.06);color:#b9929f;transition:background .15s,color .15s,border-color .15s;}',
        '.nk-search-chip:hover{color:#f7ecf0;}',
        '.nk-search-chip[aria-pressed=true]{color:#fff;border-color:transparent;background:linear-gradient(135deg,#ff5c7a,#8d2249);}',
        '.nk-search-results{overflow-y:auto;padding:8px;}',
        '.nk-search-result{display:block;padding:12px 14px;border-radius:12px;text-decoration:none;color:#f7ecf0;cursor:pointer;}',
        '.nk-search-result.nk-active,.nk-search-result:hover{background:rgba(255,92,122,.12);}',
        '.nk-search-result .nk-sr-title{font-family:Outfit,sans-serif;font-size:.92rem;font-weight:600;display:flex;align-items:center;gap:8px;}',
        '.nk-search-result .nk-sr-cat{font-size:.65rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#ff5c7a;background:rgba(255,92,122,.1);border:1px solid rgba(255,92,122,.25);border-radius:999px;padding:1px 8px;flex-shrink:0;}',
        '.nk-search-result .nk-sr-desc{margin-top:3px;font-size:.8rem;color:#b9929f;}',
        '.nk-search-result mark{background:rgba(255,92,122,.35);color:#fff;border-radius:3px;padding:0 1px;}',
        '.nk-search-empty{padding:28px 18px;text-align:center;color:#b9929f;font-size:.88rem;}'
    ].join('\n');

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ---------- Falling petals ---------- */
    var petalLayer, petalTimer;
    var PETAL_EMOJI = ['🌸', '🌸', '🌸', '🌺'];
    var MAX_PETALS = 28; // safety cap so long-lived/background tabs can't accumulate nodes forever

    function burstPetal(petal) {
        if (petal.classList.contains('nk-popped')) return;
        var rect = petal.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        petal.classList.add('nk-popped');
        setTimeout(function () { petal.remove(); }, 300);

        var count = 5 + Math.floor(Math.random() * 3);
        for (var i = 0; i < count; i++) {
            var p = document.createElement('span');
            p.className = 'nk-burst-particle';
            p.textContent = PETAL_EMOJI[Math.floor(Math.random() * PETAL_EMOJI.length)];
            p.style.left = cx + 'px';
            p.style.top = cy + 'px';
            p.style.fontSize = (0.5 + Math.random() * 0.5).toFixed(2) + 'rem';
            var angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
            var dist = 28 + Math.random() * 46;
            p.style.setProperty('--nk-bx', (Math.cos(angle) * dist).toFixed(0) + 'px');
            p.style.setProperty('--nk-by', (Math.sin(angle) * dist).toFixed(0) + 'px');
            p.style.setProperty('--nk-br', (Math.random() * 360 - 180).toFixed(0) + 'deg');
            document.body.appendChild(p);
            (function (particle) { setTimeout(function () { particle.remove(); }, 600); })(p);
        }
    }

    function spawnPetal() {
        if (!petalLayer) return;
        if (petalLayer.childElementCount >= MAX_PETALS) return;
        var petal = document.createElement('span');
        petal.className = 'nk-petal';
        petal.textContent = PETAL_EMOJI[Math.floor(Math.random() * PETAL_EMOJI.length)];
        var startX = Math.random() * 100;
        var driftA = (Math.random() * 90 - 45).toFixed(0) + 'px';
        var driftB = (Math.random() * 140 - 70).toFixed(0) + 'px';
        var driftC = (Math.random() * 180 - 90).toFixed(0) + 'px';
        var spin = (Math.random() * 540 - 270).toFixed(0) + 'deg';
        var duration = (10 + Math.random() * 8).toFixed(1) + 's';
        petal.style.left = startX + 'vw';
        petal.style.fontSize = (0.8 + Math.random() * 0.9).toFixed(2) + 'rem';
        petal.style.setProperty('--nk-drift-a', driftA);
        petal.style.setProperty('--nk-drift-b', driftB);
        petal.style.setProperty('--nk-drift-c', driftC);
        petal.style.setProperty('--nk-spin', spin);
        petal.style.animationDuration = duration;
        petal.title = 'Click me!';
        petal.addEventListener('click', function () { burstPetal(petal); });
        petalLayer.appendChild(petal);
        setTimeout(function () {
            if (petal.isConnected && !petal.classList.contains('nk-popped')) petal.remove();
        }, parseFloat(duration) * 1000 + 200);
    }

    function startPetals() {
        if (petalTimer) return;
        if (!petalLayer) {
            petalLayer = document.createElement('div');
            petalLayer.className = 'nk-petal-layer';
            document.body.appendChild(petalLayer);
        }
        petalTimer = setInterval(spawnPetal, 900);
        for (var i = 0; i < 4; i++) setTimeout(spawnPetal, i * 300);
    }

    function stopPetals() {
        if (petalTimer) { clearInterval(petalTimer); petalTimer = null; }
        if (petalLayer) { petalLayer.innerHTML = ''; }
    }

    function applyMotionPref(reduced) {
        document.documentElement.classList.toggle('nk-reduced-motion', reduced);
    }

    /* ---------- Background music player (hidden YouTube embed) ---------- */
    var PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    var PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
    var ytApiPromise = null;
    var ytPlayer = null;
    var musicState = { playing: false };

    function loadYouTubeApi() {
        if (ytApiPromise) return ytApiPromise;
        ytApiPromise = new Promise(function (resolve) {
            if (window.YT && window.YT.Player) { resolve(window.YT); return; }
            var prev = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function () {
                if (typeof prev === 'function') prev();
                resolve(window.YT);
            };
            var tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        });
        return ytApiPromise;
    }

    function musicHost() {
        var host = document.getElementById('nk-music-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'nk-music-host';
            host.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
            document.body.appendChild(host);
        }
        return host;
    }

    function updateMusicUi() {
        var btn = document.getElementById('nk-music-playpause');
        if (btn) btn.innerHTML = musicState.playing ? PAUSE_ICON : PLAY_ICON;
    }

    function destroyMusicPlayer() {
        if (ytPlayer) { try { ytPlayer.destroy(); } catch (e) { /* ignore */ } ytPlayer = null; }
        musicState.playing = false;
        updateMusicUi();
    }

    function playMusic() {
        var id = extractYouTubeId(getMusicUrl()) || extractYouTubeId(DEFAULT_MUSIC_URL);
        if (!id) return;
        if (ytPlayer) { ytPlayer.playVideo(); return; }
        loadYouTubeApi().then(function (YT) {
            if (ytPlayer) { ytPlayer.playVideo(); return; }
            var host = musicHost();
            host.innerHTML = '';
            var mount = document.createElement('div');
            host.appendChild(mount);
            ytPlayer = new YT.Player(mount, {
                videoId: id,
                playerVars: { autoplay: 1, controls: 0, disablekb: 1, loop: 1, playlist: id, playsinline: 1 },
                events: {
                    onReady: function () {
                        ytPlayer.setVolume(getMusicVolume());
                        ytPlayer.playVideo();
                    },
                    onStateChange: function (e) {
                        musicState.playing = e.data === 1;
                        updateMusicUi();
                    }
                }
            });
        });
    }

    function pauseMusic() {
        if (ytPlayer) { try { ytPlayer.pauseVideo(); } catch (e) { /* ignore */ } }
    }

    /* ---------- Advanced site search ---------- */
    var SEARCH_INDEX = [
        { title: 'Home', desc: 'Nekomo — community-driven anime client overview', url: '/home', cat: 'Pages' },
        { title: 'Features', desc: 'AniList discovery, streaming, downloads, watchlist & tracking', url: '/home#features', cat: 'Pages' },
        { title: 'Download Nekomo', desc: 'Get the app — mobile & Android TV, stable & beta channels', url: '/home#download', cat: 'Pages' },
        { title: 'Community', desc: 'Discord, Telegram, GitHub org and repositories', url: '/home#community', cat: 'Pages' },
        { title: 'Beta & Alpha Testing', desc: 'Download Nekomo beta, alpha and debug APKs, filter by device/channel', url: '/beta', cat: 'Pages' },
        { title: 'Releases & Updates', desc: 'Latest build, full changelog history, auto-update methods', url: '/updates.html', cat: 'Pages' },
        { title: 'Contributors', desc: 'Project history, repositories, developers, alternatives', url: '/contributors.html', cat: 'Pages' },
        { title: 'Community Rules', desc: 'Rules for the app, Discord, Telegram and GitHub', url: '/rules', cat: 'Pages' },
        { title: 'Sitemap', desc: 'Every page on the Nekomo website in one place', url: '/sitemap.html', cat: 'Pages' },
        { title: 'Support & Contact', desc: 'Help, FAQ, bug reports, and contact options', url: '/support', cat: 'Pages' },

        { title: 'About this website', desc: 'What nekomoapp.netlify.app is and who runs it', url: '/support#about', cat: 'FAQ' },
        { title: 'Is Nekomo available on iOS?', desc: 'No — Android and Android TV only', url: '/support#faq', cat: 'FAQ' },
        { title: 'Where do I download Nekomo?', desc: 'Only official builds on the Beta page for now', url: '/support#faq', cat: 'FAQ' },
        { title: 'Does Nekomo host videos?', desc: 'No, Nekomo hosts nothing and runs no streaming servers', url: '/support#faq', cat: 'FAQ' },
        { title: 'Why do I have to sign in?', desc: 'AniList, MyAnimeList, or Kitsu — Nekomo has no accounts of its own', url: '/support#faq', cat: 'FAQ' },
        { title: 'Can you add a streaming source?', desc: 'No sources ship by default; you install them yourself', url: '/support#faq', cat: 'FAQ' },
        { title: 'What is the background music?', desc: 'Optional, off by default — play/pause, volume, custom link', url: '/support#faq', cat: 'FAQ' },
        { title: 'Report a bug', desc: 'What to include in a GitHub issue', url: '/support#report', cat: 'FAQ' },
        { title: 'Install & update help', desc: 'Troubleshooting installs and updates', url: '/support#install', cat: 'FAQ' },
        { title: 'Sign-in problems', desc: 'Troubleshooting AniList/MAL/Kitsu login', url: '/support#login', cat: 'FAQ' },
        { title: 'Playback problems', desc: 'Troubleshooting sources and the player', url: '/support#playback', cat: 'FAQ' },
        { title: 'Extensions help', desc: 'Installing and troubleshooting third-party extensions', url: '/support#ext', cat: 'FAQ' },

        { title: 'Terms of Service', desc: 'Rules governing use of the Nekomo app and website', url: '/terms', cat: 'Legal' },
        { title: 'No hosted content', desc: 'Nekomo does not host or distribute media', url: '/terms#content', cat: 'Legal' },
        { title: 'Extensions & third-party sources', desc: 'Only install extensions you trust', url: '/terms#extensions', cat: 'Legal' },
        { title: 'Beta and test builds', desc: 'Unfinished software — use at your own risk', url: '/terms#beta', cat: 'Legal' },
        { title: 'Privacy Policy', desc: 'What Nekomo does and does not do with your data', url: '/privacy', cat: 'Legal' },
        { title: 'Data stored on your device', desc: 'Preferences, history, tokens, extensions, error logs', url: '/privacy#device', cat: 'Legal' },
        { title: 'Third-party services', desc: 'AniList, MyAnimeList, Kitsu, streaming sources, DNS providers', url: '/privacy#thirdparty', cat: 'Legal' },
        { title: 'This website (privacy)', desc: 'Local storage usage: verification, petals, music prefs', url: '/privacy#website', cat: 'Legal' },
        { title: 'DMCA & Disclaimer', desc: 'Copyright notice procedure and project disclaimers', url: '/dmca.html', cat: 'Legal' },
        { title: 'No servers or sources', desc: 'Nekomo does not operate streaming servers or providers', url: '/dmca.html#noservers', cat: 'Legal' },
        { title: 'Background music & external links', desc: 'Music licensing responsibility and third-party link disclaimer', url: '/dmca.html#media', cat: 'Legal' },
        { title: 'DMCA notice procedure', desc: 'How to file a valid copyright notice', url: '/dmca.html#notice', cat: 'Legal' },
        { title: 'Be respectful (Rule 1)', desc: 'Community conduct expectations', url: '/rules#r1', cat: 'Legal' },
        { title: 'No piracy distribution (Rule 5)', desc: 'No pirated links or source/extension requests', url: '/rules#r5', cat: 'Legal' },
        { title: 'Reporting (Rule 9)', desc: 'How to report rule-breaking or copyright issues', url: '/rules#r9', cat: 'Legal' },

        { title: 'Project history', desc: 'Shiro → Kuro No → Nekomo lineage', url: '/contributors.html', cat: 'Contributors' },
        { title: 'MarshMeadow', desc: 'Head Developer & Project Lead', url: '/contributors.html', cat: 'Contributors' },
        { title: 'Resources & Alternatives', desc: 'Dantotsu, Cloudstream, Miru, Kitsune, AnimeTV, Kamyroll', url: '/contributors.html', cat: 'Contributors' },
        { title: 'Project repositories', desc: 'Nekomo, Neko-Source, og-kuro-no-source, website repos', url: '/contributors.html', cat: 'Contributors' }
    ];
    var SEARCH_CATEGORIES = ['All', 'Pages', 'FAQ', 'Legal', 'Contributors'];

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function highlight(text, query) {
        var safe = escapeHtml(text);
        if (!query) return safe;
        var safeQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return safe.replace(new RegExp('(' + safeQuery + ')', 'ig'), '<mark>$1</mark>');
    }

    function initSiteSearch() {
        var btn = document.createElement('button');
        btn.className = 'nk-search-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Search Nekomo');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

        var overlay = document.createElement('div');
        overlay.className = 'nk-search-overlay';
        overlay.innerHTML =
            '<div class="nk-search-card" role="dialog" aria-modal="true" aria-label="Site search">' +
            '  <div class="nk-search-input-row">' +
            '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
            '    <input type="text" id="nk-search-input" placeholder="Search FAQ, legal, releases, contributors&hellip;" autocomplete="off" spellcheck="false">' +
            '    <kbd>Esc</kbd>' +
            '  </div>' +
            '  <div class="nk-search-chips" id="nk-search-chips"></div>' +
            '  <div class="nk-search-results" id="nk-search-results"></div>' +
            '</div>';

        document.body.appendChild(overlay);
        document.body.appendChild(btn);

        var input = overlay.querySelector('#nk-search-input');
        var resultsEl = overlay.querySelector('#nk-search-results');
        var chipsEl = overlay.querySelector('#nk-search-chips');
        var state = { category: 'All', results: [], active: -1 };

        SEARCH_CATEGORIES.forEach(function (cat) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'nk-search-chip';
            chip.textContent = cat;
            chip.setAttribute('aria-pressed', String(cat === 'All'));
            chip.addEventListener('click', function () {
                state.category = cat;
                chipsEl.querySelectorAll('.nk-search-chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
                runSearch();
            });
            chipsEl.appendChild(chip);
        });

        function matches(entry, query) {
            var haystack = (entry.title + ' ' + entry.desc + ' ' + entry.cat).toLowerCase();
            return haystack.indexOf(query) !== -1;
        }

        function render() {
            resultsEl.innerHTML = '';
            if (!state.results.length) {
                resultsEl.innerHTML = '<div class="nk-search-empty">No matches. Try a different word, or ask on <a href="https://discord.com/invite/E4Ezmgg7Ka" target="_blank" rel="noopener" style="color:#ff5c7a">Discord</a>.</div>';
                return;
            }
            var query = input.value.trim();
            state.results.forEach(function (entry, i) {
                var a = document.createElement('a');
                a.className = 'nk-search-result' + (i === state.active ? ' nk-active' : '');
                a.href = entry.url;
                a.innerHTML =
                    '<div class="nk-sr-title"><span class="nk-sr-cat">' + entry.cat + '</span>' + highlight(entry.title, query) + '</div>' +
                    '<div class="nk-sr-desc">' + highlight(entry.desc, query) + '</div>';
                a.addEventListener('mouseenter', function () { state.active = i; render(); });
                resultsEl.appendChild(a);
            });
        }

        function runSearch() {
            var query = input.value.trim().toLowerCase();
            var pool = state.category === 'All' ? SEARCH_INDEX : SEARCH_INDEX.filter(function (e) { return e.cat === state.category; });
            state.results = query ? pool.filter(function (e) { return matches(e, query); }) : pool;
            state.active = state.results.length ? 0 : -1;
            render();
        }

        function open() {
            overlay.classList.add('nk-open');
            document.body.style.overflow = 'hidden';
            runSearch();
            setTimeout(function () { input.focus(); }, 20);
        }
        function close() {
            overlay.classList.remove('nk-open');
            document.body.style.overflow = '';
        }

        btn.addEventListener('click', open);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        input.addEventListener('input', runSearch);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { close(); return; }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (state.results.length) { state.active = (state.active + 1) % state.results.length; render(); }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (state.results.length) { state.active = (state.active - 1 + state.results.length) % state.results.length; render(); }
            } else if (e.key === 'Enter') {
                if (state.active >= 0 && state.results[state.active]) {
                    e.preventDefault();
                    window.location.href = state.results[state.active].url;
                }
            }
        });

        document.addEventListener('keydown', function (e) {
            if (overlay.classList.contains('nk-open')) return;
            var tag = (e.target && e.target.tagName) || '';
            var typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
            if (typing) return;
            if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                open();
            }
        });
    }

    /* ---------- Settings panel ---------- */
    function buildSettings() {
        var btn = document.createElement('button');
        btn.className = 'nk-settings-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Site settings');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

        var panel = document.createElement('div');
        panel.className = 'nk-settings-panel';
        panel.innerHTML =
            '<h3>Site Settings</h3>' +
            '<div class="nk-settings-row">' +
            '  <span>Falling sakura petals</span>' +
            '  <label class="nk-switch"><input type="checkbox" id="nk-toggle-petals"><span></span></label>' +
            '</div>' +
            '<div class="nk-settings-row">' +
            '  <span>Reduce motion</span>' +
            '  <label class="nk-switch"><input type="checkbox" id="nk-toggle-motion"><span></span></label>' +
            '</div>' +
            '<div class="nk-settings-row">' +
            '  <span>Background music</span>' +
            '  <label class="nk-switch"><input type="checkbox" id="nk-toggle-music"><span></span></label>' +
            '</div>' +
            '<div class="nk-music-controls" id="nk-music-controls" hidden>' +
            '  <div class="nk-music-row">' +
            '    <button type="button" class="nk-music-btn" id="nk-music-playpause" aria-label="Play or pause music">' + PLAY_ICON + '</button>' +
            '    <input type="range" id="nk-music-volume" min="0" max="100" aria-label="Music volume">' +
            '  </div>' +
            '  <div class="nk-music-url-row">' +
            '    <input type="text" id="nk-music-url" placeholder="Paste your own YouTube link&hellip;">' +
            '    <button type="button" class="nk-music-apply" id="nk-music-apply">Set</button>' +
            '  </div>' +
            '  <p class="nk-music-status" id="nk-music-status" aria-live="polite"></p>' +
            '  <p class="nk-music-note">Music plays via YouTube and is off by default. Make sure you have permission to use any link you add &mdash; licenses vary by track. <a href="/dmca.html#media" target="_blank" rel="noopener">Learn more</a></p>' +
            '</div>';

        document.body.appendChild(panel);
        document.body.appendChild(btn);

        var petalsToggle = panel.querySelector('#nk-toggle-petals');
        var motionToggle = panel.querySelector('#nk-toggle-motion');
        petalsToggle.checked = getPetalsEnabled();
        motionToggle.checked = getReducedMotion();

        function syncPetals() {
            var enabled = getPetalsEnabled() && !getReducedMotion();
            if (enabled) startPetals(); else stopPetals();
        }

        applyMotionPref(getReducedMotion());
        syncPetals();

        petalsToggle.addEventListener('change', function () {
            localStorage.setItem(PETALS_KEY, petalsToggle.checked ? '1' : '0');
            syncPetals();
        });
        motionToggle.addEventListener('change', function () {
            localStorage.setItem(MOTION_KEY, motionToggle.checked ? '1' : '0');
            applyMotionPref(motionToggle.checked);
            syncPetals();
        });

        /* Background music controls */
        var musicToggle = panel.querySelector('#nk-toggle-music');
        var musicControls = panel.querySelector('#nk-music-controls');
        var musicPlayPause = panel.querySelector('#nk-music-playpause');
        var musicVolume = panel.querySelector('#nk-music-volume');
        var musicUrlInput = panel.querySelector('#nk-music-url');
        var musicApply = panel.querySelector('#nk-music-apply');
        var musicStatus = panel.querySelector('#nk-music-status');

        musicToggle.checked = getMusicEnabled();
        musicControls.hidden = !musicToggle.checked;
        musicVolume.value = String(getMusicVolume());
        if (getMusicUrl() !== DEFAULT_MUSIC_URL) musicUrlInput.value = getMusicUrl();

        if (musicToggle.checked) playMusic();

        musicToggle.addEventListener('change', function () {
            localStorage.setItem(MUSIC_ENABLED_KEY, musicToggle.checked ? '1' : '0');
            musicControls.hidden = !musicToggle.checked;
            if (musicToggle.checked) playMusic(); else pauseMusic();
        });
        musicPlayPause.addEventListener('click', function () {
            if (musicState.playing) pauseMusic(); else playMusic();
        });
        musicVolume.addEventListener('input', function () {
            var v = parseInt(musicVolume.value, 10);
            localStorage.setItem(MUSIC_VOLUME_KEY, String(v));
            if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(v);
        });
        musicApply.addEventListener('click', function () {
            var raw = musicUrlInput.value.trim();
            if (!raw) {
                localStorage.removeItem(MUSIC_URL_KEY);
                musicStatus.textContent = 'Reset to the default track.';
            } else if (!extractYouTubeId(raw)) {
                musicStatus.textContent = "That doesn't look like a valid YouTube link.";
                return;
            } else {
                localStorage.setItem(MUSIC_URL_KEY, raw);
                musicStatus.textContent = 'Track updated.';
            }
            destroyMusicPlayer();
            if (musicToggle.checked) playMusic();
        });

        btn.addEventListener('click', function () {
            panel.classList.toggle('nk-open');
        });
        document.addEventListener('click', function (e) {
            if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                panel.classList.remove('nk-open');
            }
        });
    }

    /* ---------- Wallpaper viewer ---------- */
    var WALLPAPER_SRC = '/Images/nekomo-wallpaper.jpg';
    var WALLPAPER_NAME = 'nekomo-wallpaper.jpg';

    function initWallpaperViewer() {
        var triggers = document.querySelectorAll('[data-wallpaper-trigger]');
        if (!triggers.length) return;

        var overlay = document.createElement('div');
        overlay.className = 'nk-wallpaper-overlay';
        overlay.innerHTML =
            '<div class="nk-wallpaper-card">' +
            '  <button type="button" class="nk-wallpaper-close" aria-label="Close">' +
            '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '  </button>' +
            '  <img src="' + WALLPAPER_SRC + '" alt="Nekomo wallpaper">' +
            '  <div class="nk-wallpaper-actions">' +
            '    <a class="nk-wallpaper-btn nk-primary" href="' + WALLPAPER_SRC + '" download="' + WALLPAPER_NAME + '">' +
            '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            '      Save wallpaper' +
            '    </a>' +
            '    <a class="nk-wallpaper-btn nk-ghost" href="' + WALLPAPER_SRC + '" target="_blank" rel="noopener">Open full size</a>' +
            '  </div>' +
            '  <p class="nk-wallpaper-caption">Free to use as your own wallpaper &mdash; part of the Nekomo site theme.</p>' +
            '</div>';
        document.body.appendChild(overlay);

        function open(e) {
            if (e) e.preventDefault();
            overlay.classList.add('nk-open');
            document.body.style.overflow = 'hidden';
        }
        function close() {
            overlay.classList.remove('nk-open');
            document.body.style.overflow = '';
        }

        triggers.forEach(function (el) { el.addEventListener('click', open); });
        overlay.querySelector('.nk-wallpaper-close').addEventListener('click', close);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') close();
        });
    }

    /* ---------- Skip to content (a11y) ---------- */
    function initSkipLink() {
        var nav = document.querySelector('nav');
        var target = document.querySelector('main') || document.querySelector('header.hero') ||
            (nav && nav.nextElementSibling);
        if (!target) return;
        if (!target.id) target.id = 'nk-main-content';
        target.setAttribute('tabindex', '-1');

        var link = document.createElement('a');
        link.href = '#' + target.id;
        link.className = 'nk-skip-link';
        link.textContent = 'Skip to content';
        link.addEventListener('click', function () {
            setTimeout(function () { target.focus(); }, 0);
        });
        document.body.insertBefore(link, document.body.firstChild);
    }

    /* ---------- Mobile nav toggle ---------- */
    function initNavToggle() {
        var toggle = document.querySelector('.nav-toggle');
        var links = document.querySelector('.nav-links');
        if (!toggle || !links) return;

        function close() {
            links.classList.remove('nk-nav-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
        function toggleOpen() {
            var open = links.classList.toggle('nk-nav-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleOpen();
        });
        links.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', close);
        });
        document.addEventListener('click', function (e) {
            if (!links.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) close();
        });
        window.addEventListener('resize', close);

        document.querySelectorAll('.nk-dd').forEach(function (dd) {
            var btn = dd.querySelector('.nk-dd-btn');
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var open = dd.classList.toggle('nk-open');
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            document.addEventListener('click', function () {
                dd.classList.remove('nk-open');
                btn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    function init() {
        injectStyles();
        initSkipLink();
        buildSettings();
        initSiteSearch();
        initNavToggle();
        initWallpaperViewer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
