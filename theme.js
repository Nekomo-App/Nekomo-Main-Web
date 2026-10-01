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

    var css = [
        '.nk-petal-layer{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden;}',
        '.nk-petal{position:absolute;top:-5vh;font-size:1.1rem;opacity:.75;will-change:transform;animation:nk-fall linear forwards;filter:drop-shadow(0 0 4px rgba(255,92,122,.3));}',
        '@keyframes nk-fall{to{transform:translate(var(--nk-drift),112vh) rotate(var(--nk-spin));}}',
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
        '@media (max-width:480px){.nk-settings-panel{right:14px;width:calc(100vw - 28px);}.nk-settings-btn{right:14px;}}',
        '@media (max-width:640px){footer{padding-bottom:92px;}}',
        '.nk-reduced-motion *,.nk-reduced-motion *::before,.nk-reduced-motion *::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;scroll-behavior:auto !important;}'
    ].join('\n');

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ---------- Falling petals ---------- */
    var petalLayer, petalTimer;
    var PETAL_EMOJI = ['🌸', '🌸', '🌸', '🌺'];

    function spawnPetal() {
        if (!petalLayer) return;
        var petal = document.createElement('span');
        petal.className = 'nk-petal';
        petal.textContent = PETAL_EMOJI[Math.floor(Math.random() * PETAL_EMOJI.length)];
        var startX = Math.random() * 100;
        var drift = (Math.random() * 160 - 80).toFixed(0) + 'px';
        var spin = (Math.random() * 540 - 270).toFixed(0) + 'deg';
        var duration = (9 + Math.random() * 7).toFixed(1) + 's';
        petal.style.left = startX + 'vw';
        petal.style.fontSize = (0.8 + Math.random() * 0.9).toFixed(2) + 'rem';
        petal.style.setProperty('--nk-drift', drift);
        petal.style.setProperty('--nk-spin', spin);
        petal.style.animationDuration = duration;
        petalLayer.appendChild(petal);
        setTimeout(function () { petal.remove(); }, parseFloat(duration) * 1000 + 200);
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

        btn.addEventListener('click', function () {
            panel.classList.toggle('nk-open');
        });
        document.addEventListener('click', function (e) {
            if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                panel.classList.remove('nk-open');
            }
        });
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
    }

    function init() {
        injectStyles();
        buildSettings();
        initNavToggle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
