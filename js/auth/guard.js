var currentUser = null;
var currentProfile = null;
var PUBLIC_PAGES = ['landing', 'about', 'ban', '404', 'login', 'register'];

function getPageName() {
    var path = window.location.pathname;
    if (path === '/' || path === '') return 'landing';
    var parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] || 'home';
}

function getQueryParam(name) {
    return new URL(window.location.href).searchParams.get(name);
}

function parsePathId() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 1] : null;
}

async function initAuth() {
    try {
        var session = getSession();
        if (!session) {
            var page = getPageName();
            if (PUBLIC_PAGES.indexOf(page) === -1) { window.location.href = '/'; return; }
            return;
        }

        var r = await fetch(AUTH_URL + '/user', { headers: authHeaders() });
        if (!r.ok) { clearSession(); window.location.href = '/home/'; return; }
        var userData = await r.json();
        currentUser = userData;

        var profile = await supabaseFetch(API_URL + '/profiles?select=*&id=eq.' + userData.id + '&limit=1', { headers: authHeaders() });
        currentProfile = profile[0] || null;

        if (currentProfile?.is_banned) {
            var banReason = '', banBy = '', banDate = '';
            try {
                var banData = await supabaseFetch(API_URL + '/bans?select=*,banner:profiles!banned_by(username)&user_id=eq.' + currentProfile.id + '&limit=1&order=created_at.desc', { headers: authHeaders() });
                if (banData && banData[0]) {
                    banReason = banData[0].reason || '';
                    banBy = banData[0].banner ? banData[0].banner.username : '';
                    banDate = banData[0].created_at || '';
                }
            } catch(e) {}
            sessionStorage.setItem('banData', JSON.stringify({ reason: banReason, by: banBy, date: banDate }));
            clearSession();
            window.location.href = '/ban/';
            return;
        }

        var page = getPageName();
        if (PUBLIC_PAGES.indexOf(page) !== -1 && page !== '404' && page !== 'home') {
            window.location.href = '/home/';
        }
    } catch(e) {
        var page = getPageName();
        if (PUBLIC_PAGES.indexOf(page) === -1) window.location.href = '/home/';
    }
}

initAuth();