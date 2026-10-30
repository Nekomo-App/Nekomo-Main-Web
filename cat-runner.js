/* Neko Run — a Chrome-dino style pixel cat runner for the 404 page.
   Space / Up / W = jump (hold for higher), Down / S = duck, tap the canvas or the touch buttons on mobile. */
(function () {
    var canvas = document.getElementById('nk-runner');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');

    var pathEl = document.getElementById('nk-missing-path');
    if (pathEl && location.pathname && location.pathname !== '/404.html') {
        pathEl.textContent = decodeURIComponent(location.pathname);
    }

    var W = 480, H = 150, GROUND = 128, PX = 2, CAT_X = 36;
    var STEP = 1000 / 60;
    var HI_KEY = 'nekomo_404_highscore', MUTE_KEY = 'nekomo_404_muted';
    var FONT = '"Press Start 2P", monospace';

    var PALETTE = {
        x: '#f7ecf0', e: '#0c0508', p: '#ff5c7a', c: '#e5395f', y: '#ffd166', '*': '#ff5c7a',
        G: '#3f9e55', g: '#8fdc8a', s: '#7a4b2a', b: '#c9a3b1', f: '#ffd166', k: '#e0a63a',
        w: 'rgba(255,179,194,0.16)'
    };

    var SPRITES = {
        run1: [
            '................x.....x.',
            '...............xpx...xpx',
            '..xx...........xxxxxxxxx',
            '.x..x..........xxxxxxxxx',
            '.x.............xxexxxexx',
            '.x.............xxxxpxxxx',
            '..x....xxxxxxxxxxxxxxxx.',
            '...xxxxxxxxxxxxcccycxx..',
            '....xxxxxxxxxxxxxxxxx...',
            '....xxxxxxxxxxxxxxxxx...',
            '....xxxxxxxxxxxxxxxx....',
            '....xx..xx.....xx..xx...',
            '...xx....xx...xx....xx..',
            '...x......x...x......x..'
        ],
        run2: [
            '................x.....x.',
            '...............xpx...xpx',
            '..xx...........xxxxxxxxx',
            '.x..x..........xxxxxxxxx',
            '.x.............xxexxxexx',
            '.x.............xxxxpxxxx',
            '..x....xxxxxxxxxxxxxxxx.',
            '...xxxxxxxxxxxxcccycxx..',
            '....xxxxxxxxxxxxxxxxx...',
            '....xxxxxxxxxxxxxxxxx...',
            '....xxxxxxxxxxxxxxxx....',
            '.....xxxx.......xxxx....',
            '.....xxxx.......xxxx....',
            '......xx.........xx.....'
        ],
        jump: [
            '................x.....x.',
            '...............xpx...xpx',
            '...............xxxxxxxxx',
            'xx.............xxxxxxxxx',
            '..x............xxexxxexx',
            '..x............xxxxpxxxx',
            '..x....xxxxxxxxxxxxxxxx.',
            '...xxxxxxxxxxxxcccycxx..',
            '....xxxxxxxxxxxxxxxxxxx.',
            '....xxxxxxxxxxxxxxxx.xx.',
            '...xxxxxxxxxxxxxxxx.....',
            '..xx.xx.................',
            '.xx..x..................',
            '........................'
        ],
        dead: [
            '................x.....x.',
            '...............xpx...xpx',
            '..xx...........xxxxxxxxx',
            '.x..x..........x*x*x*x*x',
            '.x.............xx*xxx*xx',
            '.x.............x*x*x*x*x',
            '..x....xxxxxxxxxxxxxpxxx',
            '...xxxxxxxxxxxxcccycxx..',
            '....xxxxxxxxxxxxxxxxx...',
            '....xxxxxxxxxxxxxxxxx...',
            '....xxxxxxxxxxxxxxxx....',
            '....xx..xx.....xx..xx...',
            '....xx..xx.....xx..xx...',
            '....xx..xx.....xx..xx...'
        ],
        duck1: [
            '....................x....x..',
            '...................xpx..xpx.',
            'xx.....xxxxxxxxxxxxxxxxxxxx.',
            '..xx.xxxxxxxxxxxxxxxexxxxex.',
            '....xxxxxxxxxxxxxxxxxxpxxxx.',
            '....xxxxxxxxxxxxxxcccycxx...',
            '....xxxxxxxxxxxxxxxxxxx.....',
            '....xx..xx......xx..xx......',
            '...xx....xx....xx....xx.....'
        ],
        duck2: [
            '....................x....x..',
            '...................xpx..xpx.',
            'xx.....xxxxxxxxxxxxxxxxxxxx.',
            '..xx.xxxxxxxxxxxxxxxexxxxex.',
            '....xxxxxxxxxxxxxxxxxxpxxxx.',
            '....xxxxxxxxxxxxxxcccycxx...',
            '....xxxxxxxxxxxxxxxxxxx.....',
            '.....xxxx........xxxx.......',
            '.....xxxx........xxxx.......'
        ],
        crow1: [
            '.......b..........',
            '.......bb.........',
            '.......bbb........',
            '...bb..bbbb.......',
            '..bebbbbbbbbbbbb..',
            'yybbbbbbbbbbbbbbbb',
            '....bbbbbbbbbbb...',
            '.......bbbbbb.....',
            '..................',
            '..................',
            '..................'
        ],
        crow2: [
            '..................',
            '..................',
            '..................',
            '...bb.............',
            '..bebbbbbbbbbbbb..',
            'yybbbbbbbbbbbbbbbb',
            '....bbbbbbbbbbb...',
            '.......bbbb.......',
            '.......bbb........',
            '.......bb.........',
            '.......b..........'
        ],
        fish: [
            '...ffff....',
            '.ffffffff.f',
            'fefffkffff.',
            'ffffffkfff.',
            '.ffffffff.f',
            '...ffff....'
        ],
        cloud: [
            '..........wwww..........',
            '.......wwwwwwwwww.......',
            '....wwwwwwwwwwwwwwww....',
            'wwwwwwwwwwwwwwwwwwwwwwww'
        ]
    };

    function cucumber(w, h, seed) {
        var rows = [];
        for (var r = 0; r < h; r++) {
            var row = '';
            for (var c = 0; c < w; c++) {
                var edge = (r === 1 || r === h - 1) ? 2 : (r === 0 ? -1 : 1);
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

    var IMG = {};
    Object.keys(SPRITES).forEach(function (name) {
        var rows = SPRITES[name];
        var w = 0;
        rows.forEach(function (r) { w = Math.max(w, r.length); });
        var off = document.createElement('canvas');
        off.width = w * PX;
        off.height = rows.length * PX;
        var o = off.getContext('2d');
        rows.forEach(function (row, y) {
            for (var x = 0; x < row.length; x++) {
                var col = PALETTE[row[x]];
                if (!col) continue;
                o.fillStyle = col;
                o.fillRect(x * PX, y * PX, PX, PX);
            }
        });
        IMG[name] = off;
    });

    var dpr = 1;
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    function resize() {
        // Narrow screens get a shorter track so the pixels stay big enough to read.
        if (state !== 'running') {
            W = canvas.clientWidth && canvas.clientWidth < 520 ? 320 : 480;
            canvas.style.aspectRatio = W + ' / ' + H;
        }
        dpr = Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 1)));
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        draw();
    }

    /* ---------- Sound ---------- */
    var audio = null;
    var muted = localStorage.getItem(MUTE_KEY) === '1';
    var muteBtn = document.getElementById('nk-runner-mute');
    function updateMuteUi() {
        if (!muteBtn) return;
        muteBtn.setAttribute('aria-pressed', String(muted));
        muteBtn.querySelector('span').textContent = muted ? 'Sound off' : 'Sound on';
        var wave = muteBtn.querySelector('.nk-wave');
        if (wave) wave.style.display = muted ? 'none' : '';
    }
    function beep(freq, dur, type, slide) {
        if (muted) return;
        try {
            if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
            if (audio.state === 'suspended') audio.resume();
            var t = audio.currentTime;
            var osc = audio.createOscillator(), gain = audio.createGain();
            osc.type = type || 'square';
            osc.frequency.setValueAtTime(freq, t);
            if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
            gain.gain.setValueAtTime(0.05, t);
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
    if (muteBtn) {
        updateMuteUi();
        muteBtn.addEventListener('click', function () {
            muted = !muted;
            localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
            updateMuteUi();
            canvas.focus({ preventScroll: true });
        });
    }

    /* ---------- State ---------- */
    var state, cat, obstacles, fishes, clouds, petals, specks, speed, distance, score, bonus, hi, flashUntil,
        overAt, nextMilestone, frame, popups;
    hi = parseInt(localStorage.getItem(HI_KEY), 10) || 0;
    var input = { jump: false, duck: false };
    var reducedMotion = localStorage.getItem('nekomo_reduced_motion') === '1' ||
        (localStorage.getItem('nekomo_reduced_motion') === null && window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function rand(a, b) { return a + Math.random() * (b - a); }

    function reset() {
        state = 'ready';
        cat = { y: 0, vy: 0, ducking: false, grounded: true };
        obstacles = []; fishes = []; popups = [];
        speed = 5.5; distance = 0; score = 0; bonus = 0; flashUntil = 0; frame = 0; nextMilestone = 100;
        clouds = [];
        for (var i = 0; i < 3; i++) clouds.push({ x: rand(0, W), y: rand(12, 60), s: rand(0.15, 0.35) });
        petals = [];
        if (!reducedMotion) for (var j = 0; j < 10; j++) petals.push(newPetal(rand(0, W)));
        specks = [];
        for (var k = 0; k < 40; k++) specks.push({ x: rand(0, W), y: GROUND + rand(4, 18), w: Math.random() < 0.3 ? 4 : 2 });
    }
    function newPetal(x) {
        return { x: x, y: rand(-10, GROUND - 20), vx: rand(-0.6, -0.2), vy: rand(0.15, 0.45), ph: rand(0, 6.28) };
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
    function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    function spawnObstacle() {
        var r = Math.random();
        if (score > 180 && r < 0.3) {
            // y = top of sprite; the hitbox is the 8px body band starting 8px below it.
            // low = must jump, mid = duck (or jump), high = flies over a running cat.
            var heights = [GROUND - 18, GROUND - 34, GROUND - 70];
            var img = IMG.crow1;
            obstacles.push({ type: 'crow', x: W + 10, y: heights[Math.floor(Math.random() * 3)], w: img.width, h: img.height, extra: rand(0.4, 1.2) });
            return;
        }
        var maxGroup = speed > 9 ? 3 : speed > 7 ? 2 : 1;
        var count = 1 + Math.floor(Math.random() * maxGroup);
        var x = W + 10;
        for (var i = 0; i < count; i++) {
            var name = ['cuke1', 'cuke2', 'cuke3'][Math.floor(Math.random() * 3)];
            var im = IMG[name];
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
        state = 'running';
        jump();
    }
    function jump() {
        if (state !== 'running' || !cat.grounded) return;
        cat.vy = 10.4; cat.grounded = false; cat.ducking = false;
        sfx.jump();
    }

    function update() {
        frame++;
        clouds.forEach(function (c) {
            c.x -= c.s * (state === 'running' ? speed / 6 : 0.3);
            if (c.x < -60) { c.x = W + rand(0, 80); c.y = rand(12, 60); }
        });
        petals.forEach(function (p, i) {
            p.ph += 0.05;
            p.x += p.vx - (state === 'running' ? speed * 0.15 : 0);
            p.y += p.vy;
            if (p.x < -6 || p.y > GROUND) petals[i] = newPetal(W + rand(0, 40));
        });
        if (state !== 'running') return;

        speed = Math.min(12, speed + 0.0014);
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
                obstacles[obstacles.length - 1].gap = rand(200, 330) + speed * 14;
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
        if (score > hi) { hi = score; localStorage.setItem(HI_KEY, String(hi)); }
        sfx.die();
        draw();
    }

    function pad(n) { return ('00000' + n).slice(-5); }
    function text(str, x, y, size, color, align) {
        ctx.font = size + 'px ' + FONT;
        ctx.fillStyle = color;
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(str, x, y);
    }

    function draw() {
        if (!state) return;
        ctx.clearRect(0, 0, W, H);

        clouds.forEach(function (c) { ctx.drawImage(IMG.cloud, Math.round(c.x), Math.round(c.y)); });
        ctx.fillStyle = 'rgba(255,122,149,0.75)';
        petals.forEach(function (p) {
            var s = Math.sin(p.ph) > 0 ? 4 : 2;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), s, 2);
        });

        ctx.fillStyle = 'rgba(247,236,240,0.55)';
        ctx.fillRect(0, GROUND, W, 2);
        ctx.fillStyle = 'rgba(185,146,159,0.45)';
        specks.forEach(function (s) { ctx.fillRect(Math.round(s.x), Math.round(s.y), s.w, 2); });

        fishes.forEach(function (f) { ctx.drawImage(IMG.fish, Math.round(f.x), Math.round(f.y + Math.sin(f.t / 8) * 3)); });
        obstacles.forEach(function (o) {
            var img = o.type === 'crow' ? (Math.floor(frame / 10) % 2 ? IMG.crow2 : IMG.crow1) : o.img;
            ctx.drawImage(img, Math.round(o.x), Math.round(o.y));
        });

        var spr = catSprite();
        ctx.drawImage(spr, CAT_X, Math.round(GROUND - cat.y - spr.height + 2));

        popups.forEach(function (p) {
            text('+25', Math.round(p.x), Math.round(p.y), 8, 'rgba(255,209,102,' + (1 - p.t / 40) + ')');
        });

        var blink = frame < flashUntil && Math.floor(frame / 8) % 2 === 0;
        if (!blink) text(pad(score), W - 10, 10, 10, '#f7ecf0', 'right');
        if (hi) text('HI ' + pad(hi), W - 72, 10, 10, '#b9929f', 'right');

        if (state === 'ready') {
            text('NEKO RUN', W / 2, 36, 16, '#ff5c7a', 'center');
            text(coarse ? 'TAP TO START' : 'PRESS SPACE TO START', W / 2, 64, 8, '#f7ecf0', 'center');
        } else if (state === 'over') {
            text('MEOW OVER', W / 2, 30, 16, '#ff5c7a', 'center');
            text(score >= hi && score > 0 ? 'NEW HIGH SCORE!' : (coarse ? 'TAP' : 'SPACE') + ' TO TRY AGAIN', W / 2, 56, 8, '#f7ecf0', 'center');
            drawRetry(W / 2 - 11, 74);
        }
    }

    function drawRetry(x, y) {
        var r = [
            '....xxxxxx.',
            '..xx......x',
            '.x.......xx',
            'x.......xxx',
            'x..........',
            'x..........',
            'x.........x',
            '.x.......x.',
            '..xx...xx..',
            '....xxx....'
        ];
        ctx.fillStyle = '#f7ecf0';
        r.forEach(function (row, j) {
            for (var i = 0; i < row.length; i++) if (row[i] === 'x') ctx.fillRect(x + i * 2, y + j * 2, 2, 2);
        });
    }

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
        if (state !== 'over') draw();
        requestAnimationFrame(loop);
    }

    /* ---------- Input ---------- */
    function blocked(e) {
        var t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return true;
        if (t && /^(BUTTON|A)$/.test(t.tagName) && t !== canvas && e.code === 'Space') return true;
        return !!document.querySelector('.nk-gate-overlay, .nk-search-overlay.nk-open, .nk-wallpaper-overlay.nk-open');
    }
    function inView() {
        var r = canvas.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight;
    }
    function pressJump() {
        input.jump = true;
        if (state === 'running') jump(); else start();
    }

    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey || blocked(e) || !inView()) return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            if (!e.repeat) pressJump();
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            e.preventDefault();
            input.duck = true;
        }
    });
    document.addEventListener('keyup', function (e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') input.jump = false;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') input.duck = false;
    });

    canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        canvas.focus({ preventScroll: true });
        pressJump();
    });
    window.addEventListener('pointerup', function () { input.jump = false; });
    window.addEventListener('pointercancel', function () { input.jump = false; input.duck = false; });

    function holdButton(id, onDown, onUp) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', function (e) { e.preventDefault(); onDown(); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, onUp); });
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    holdButton('nk-runner-jump', pressJump, function () { input.jump = false; });
    holdButton('nk-runner-duck', function () { input.duck = true; }, function () { input.duck = false; });

    window.addEventListener('resize', resize);
    reset();
    resize();
    if (document.fonts && document.fonts.load) {
        document.fonts.load('12px "Press Start 2P"').then(draw, draw);
    }
    requestAnimationFrame(loop);
})();
