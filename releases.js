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

    // Fallback when the main repo has no published release for a slot: use the
    // Nekomo builds committed to Neko-Source/apks (Nekomo-<phone|tv>-<release|beta|debug>.apk).
    var SRC_REPO = 'Nekomo-App/Neko-Source';
    var SRC_APKS_API = 'https://api.github.com/repos/' + SRC_REPO + '/contents/apks';
    var SRC_APKS_URL = 'https://github.com/' + SRC_REPO + '/tree/main/apks';

    function fillFromSource(matrix) {
        return fetch(SRC_APKS_API).then(function (res) {
            if (!res.ok) throw new Error('GitHub API error (' + res.status + ')');
            return res.json();
        }).then(function (files) {
            if (!Array.isArray(files)) return false;
            var byName = {};
            files.forEach(function (f) {
                if (f.type === 'file' && /^Nekomo-(phone|tv)-(release|beta|debug)\.apk$/i.test(f.name)) byName[f.name.toLowerCase()] = f;
            });
            var filled = false;
            [['mobile', 'phone'], ['tv', 'tv']].forEach(function (p) {
                [['stable', ['release']], ['beta', ['beta', 'debug']]].forEach(function (c) {
                    if (matrix[p[0]][c[0]]) return;
                    for (var i = 0; i < c[1].length; i++) {
                        var f = byName['nekomo-' + p[1] + '-' + c[1][i] + '.apk'];
                        if (f) {
                            matrix[p[0]][c[0]] = {
                                release: { tag_name: 'Latest build', html_url: SRC_APKS_URL, published_at: null },
                                asset: { name: f.name, size: f.size, browser_download_url: f.download_url }
                            };
                            filled = true;
                            break;
                        }
                    }
                });
            });
            return filled;
        }).catch(function () { return false; });
    }

    function fetchMatrix() {
        return fetch(API_URL).then(function (res) {
            if (!res.ok) throw new Error('GitHub API error (' + res.status + ')');
            return res.json();
        }).then(function (releases) {
            if (!Array.isArray(releases)) throw new Error('Unexpected API response');
            releases = releases.filter(function (r) { return !r.draft; });
            var matrix = buildMatrix(releases);
            var missing = ['mobile', 'tv'].some(function (p) { return !matrix[p].stable || !matrix[p].beta; });
            return (missing ? fillFromSource(matrix) : Promise.resolve(false)).then(function (filled) {
                return {
                    releases: releases,
                    matrix: matrix,
                    hasReleases: releases.length > 0 || filled
                };
            });
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
