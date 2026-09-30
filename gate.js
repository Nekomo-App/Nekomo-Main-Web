/* Nekomo site gate — verification puzzle + DMCA/disclaimer notice.
   Shows once per browser session (sessionStorage). Include with:
   <script src="gate.js" defer></script> */
(function () {
    var VERIFIED_KEY = 'nekomo_verified';
    var ACK_KEY = 'nekomo_disclaimer_ack';

    var css = [
        '.nk-gate-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(8,3,6,0.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}',
        '.nk-gate-card{width:100%;max-width:440px;background:#150910;border:1px solid rgba(255,92,122,0.25);border-radius:20px;padding:36px 32px;text-align:center;color:#f7ecf0;font-family:Inter,system-ui,sans-serif;box-shadow:0 24px 80px rgba(0,0,0,0.6),0 0 60px rgba(229,57,95,0.12);animation:nk-pop .35s ease;}',
        '@keyframes nk-pop{from{opacity:0;transform:scale(.94) translateY(10px)}to{opacity:1;transform:none}}',
        '.nk-gate-card img{width:84px;image-rendering:pixelated;filter:drop-shadow(0 0 18px rgba(255,92,122,.35));}',
        '.nk-gate-card h2{font-family:Outfit,Inter,sans-serif;font-size:1.5rem;font-weight:700;margin-top:16px;letter-spacing:-.01em;}',
        '.nk-gate-card p{font-size:.9rem;color:#b9929f;margin-top:8px;line-height:1.6;}',
        '.nk-puzzle-q{font-family:Outfit,sans-serif;font-size:1.6rem;font-weight:700;color:#ff5c7a;margin:20px 0 14px;letter-spacing:.05em;}',
        '.nk-puzzle-row{display:flex;gap:10px;margin-top:6px;}',
        '.nk-puzzle-input{flex:1;min-width:0;background:rgba(255,92,122,.06);border:1px solid rgba(255,92,122,.2);border-radius:12px;padding:12px 16px;color:#f7ecf0;font-size:1.05rem;font-family:Outfit,sans-serif;font-weight:600;text-align:center;outline:none;transition:border-color .2s,box-shadow .2s;}',
        '.nk-puzzle-input:focus{border-color:#ff5c7a;box-shadow:0 0 0 3px rgba(255,92,122,.15);}',
        '.nk-puzzle-input::placeholder{color:#b9929f;font-weight:400;}',
        '.nk-gate-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#ff5c7a,#8d2249);color:#fff;border:none;border-radius:12px;padding:12px 24px;font-family:Outfit,sans-serif;font-size:.95rem;font-weight:600;cursor:pointer;transition:filter .2s,transform .15s;}',
        '.nk-gate-btn:hover{filter:brightness(1.15);}',
        '.nk-gate-btn:active{transform:scale(.97);}',
        '.nk-gate-error{min-height:1.3em;margin-top:12px;font-size:.82rem;color:#ff7a95;}',
        '.nk-gate-card.nk-shake{animation:nk-shake .4s ease;}',
        '@keyframes nk-shake{0%,100%{transform:none}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}',
        '.nk-disclaimer-card{max-width:560px;max-height:85vh;display:flex;flex-direction:column;text-align:left;}',
        '.nk-disclaimer-card h2,.nk-disclaimer-card p{text-align:left;}',
        '.nk-disclaimer-scroll{margin-top:16px;overflow-y:auto;padding-right:10px;font-size:.85rem;color:#b9929f;line-height:1.7;}',
        '.nk-disclaimer-scroll h3{font-family:Outfit,sans-serif;color:#f7ecf0;font-size:.95rem;margin:16px 0 6px;}',
        '.nk-disclaimer-scroll h3:first-child{margin-top:0;}',
        '.nk-disclaimer-scroll p{margin-top:0;font-size:.85rem;}',
        '.nk-disclaimer-scroll::-webkit-scrollbar{width:8px;}',
        '.nk-disclaimer-scroll::-webkit-scrollbar-thumb{background:rgba(255,92,122,.25);border-radius:4px;}',
        '.nk-disclaimer-actions{margin-top:22px;display:flex;gap:12px;flex-wrap:wrap;}',
        '.nk-gate-btn-ghost{background:rgba(255,92,122,.07);border:1px solid rgba(255,92,122,.2);color:#f7ecf0;text-decoration:none;}',
        '.nk-gate-btn-ghost:hover{background:rgba(255,92,122,.14);filter:none;}'
    ].join('\n');

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    function lockScroll(locked) {
        document.body.style.overflow = locked ? 'hidden' : '';
    }

    function makeOverlay(cardClass) {
        var overlay = document.createElement('div');
        overlay.className = 'nk-gate-overlay';
        var card = document.createElement('div');
        card.className = 'nk-gate-card ' + (cardClass || '');
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        lockScroll(true);
        return { overlay: overlay, card: card };
    }

    function removeOverlay(overlay) {
        overlay.remove();
        lockScroll(false);
    }

    /* ---------- Verification puzzle ---------- */
    function showGate(onPass) {
        var g = makeOverlay();
        var a = 1 + Math.floor(Math.random() * 5); // 1-5
        var b = 1 + Math.floor(Math.random() * 5);

        g.card.innerHTML =
            '<img src="/Images/nekomo-logo.png" alt="Nekomo cat">' +
            '<h2>Quick check</h2>' +
            '<p>Answer this to prove you\'re human (or at least a smart cat).</p>' +
            '<div class="nk-puzzle-q">' + a + ' + ' + b + ' = ?</div>' +
            '<form class="nk-puzzle-row">' +
            '  <input class="nk-puzzle-input" type="text" inputmode="numeric" autocomplete="off" placeholder="Answer" aria-label="Puzzle answer">' +
            '  <button class="nk-gate-btn" type="submit">Verify</button>' +
            '</form>' +
            '<div class="nk-gate-error" role="alert"></div>';

        var input = g.card.querySelector('.nk-puzzle-input');
        var err = g.card.querySelector('.nk-gate-error');
        input.focus();

        g.card.querySelector('form').addEventListener('submit', function (e) {
            e.preventDefault();
            if (parseInt(input.value.trim(), 10) === a + b) {
                removeOverlay(g.overlay);
                onPass();
            } else {
                err.textContent = 'Not quite — try again.';
                g.card.classList.remove('nk-shake');
                void g.card.offsetWidth; // restart animation
                g.card.classList.add('nk-shake');
                input.value = '';
                input.focus();
                // new numbers each failed attempt
                a = 1 + Math.floor(Math.random() * 5);
                b = 1 + Math.floor(Math.random() * 5);
                g.card.querySelector('.nk-puzzle-q').textContent = a + ' + ' + b + ' = ?';
            }
        });
    }

    /* ---------- DMCA / disclaimer modal ---------- */
    function showDisclaimer(onDone) {
        var g = makeOverlay('nk-disclaimer-card');

        g.card.innerHTML =
            '<h2>Before you continue</h2>' +
            '<p>Please read and acknowledge the Nekomo disclaimer.</p>' +
            '<div class="nk-disclaimer-scroll">' +
            '  <h3>No hosted content</h3>' +
            '  <p>Nekomo is an open-source project and does not host, store, upload, or distribute media content. It does not operate, own, maintain, or control streaming servers, content providers, or third-party sources.</p>' +
            '  <h3>Third-party data</h3>' +
            '  <p>Any metadata, images, artwork, descriptions, or other information displayed through Nekomo-related applications may originate from third-party APIs or external services.</p>' +
            '  <h3>No affiliation</h3>' +
            '  <p>Nekomo is not affiliated with, endorsed by, sponsored by, or officially connected to AniList, MyAnimeList, Kitsu, TMDb, or any other content provider unless explicitly stated otherwise.</p>' +
            '  <h3>Your responsibility</h3>' +
            '  <p>All trademarks, copyrights, logos, and names belong to their respective owners. You are responsible for how you use the software and for complying with all applicable laws in your jurisdiction.</p>' +
            '  <p>Full details are on the <a href="dmca.html" style="color:#ff5c7a">DMCA &amp; Disclaimer page</a>.</p>' +
            '</div>' +
            '<div class="nk-disclaimer-actions">' +
            '  <button class="nk-gate-btn" type="button">I Understand</button>' +
            '  <a class="nk-gate-btn nk-gate-btn-ghost" href="dmca.html">Read Full Disclaimer</a>' +
            '</div>';

        g.card.querySelector('button').addEventListener('click', function () {
            removeOverlay(g.overlay);
            onDone();
        });
    }

    function maybeDisclaimer() {
        if (!sessionStorage.getItem(ACK_KEY)) {
            showDisclaimer(function () {
                sessionStorage.setItem(ACK_KEY, '1');
            });
        }
    }

    function init() {
        injectStyles();
        if (!sessionStorage.getItem(VERIFIED_KEY)) {
            showGate(function () {
                sessionStorage.setItem(VERIFIED_KEY, '1');
                maybeDisclaimer();
            });
        } else {
            maybeDisclaimer();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
