/* Nekomo releases helper — fetches GitHub releases and sorts assets into a
   mobile/TV x stable/beta matrix. Shared by index.html, uwu-apk.html, and
   updates.html. Load this (non-deferred) before any inline script that uses
   window.NekomoReleases. */
(function (global) {
    var REPO = 'Nekomo-App/Nekomo';
    var API_URL = 'https://api.github.com/repos/' + REPO + '/releases?per_page=30';
    var RELEASES_URL = 'https://github.com/' + REPO + '/releases';

    // Figures out platform (mobile/tv) and channel (stable/beta) from an asset's filename.
    function categorize(name) {
        var n = (name || '').toLowerCase();
        var platform = /\btv\b/.test(n) ? 'tv' : 'mobile';
        var channel = /\b(debug|beta|nightly|alpha|dev)\b/.test(n) ? 'beta' : 'stable';
        return { platform: platform, channel: channel };
    }

    function isInstallable(name) {
        return /\.(apk|zip|exe)$/i.test(name || '');
    }

    function formatBytes(bytes) {
        if (!bytes) return '';
        var mb = bytes / (1024 * 1024);
        return mb >= 1 ? mb.toFixed(1) + ' MB' : (bytes / 1024).toFixed(0) + ' KB';
    }

    // Walks releases newest-first, filling each of the 4 slots with the
    // newest matching asset found. A slot stays null if nothing matches.
    function buildMatrix(releases) {
        var matrix = { mobile: { stable: null, beta: null }, tv: { stable: null, beta: null } };
        releases.forEach(function (release) {
            (release.assets || []).forEach(function (asset) {
                if (!isInstallable(asset.name)) return;
                var cat = categorize(asset.name);
                if (!matrix[cat.platform][cat.channel]) {
                    matrix[cat.platform][cat.channel] = { release: release, asset: asset };
                }
            });
        });
        return matrix;
    }

    function fetchMatrix() {
        return fetch(API_URL).then(function (res) {
            if (!res.ok) throw new Error('GitHub API error (' + res.status + ')');
            return res.json();
        }).then(function (releases) {
            if (!Array.isArray(releases)) throw new Error('Unexpected API response');
            releases = releases.filter(function (r) { return !r.draft; });
            return {
                releases: releases,
                matrix: buildMatrix(releases),
                hasReleases: releases.length > 0
            };
        });
    }

    global.NekomoReleases = {
        repo: REPO,
        releasesUrl: RELEASES_URL,
        apiUrl: API_URL,
        categorize: categorize,
        isInstallable: isInstallable,
        formatBytes: formatBytes,
        buildMatrix: buildMatrix,
        fetchMatrix: fetchMatrix
    };
})(window);
