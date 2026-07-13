var AUTH_URL = SUPABASE_URL + '/auth/v1';
var API_URL = SUPABASE_URL + '/rest/v1';
var STORAGE_URL = SUPABASE_URL + '/storage/v1';
var supabaseAnonKey = SUPABASE_ANON_KEY;

function getSession() {
    var token = localStorage.getItem('sb-access-token');
    var user = localStorage.getItem('sb-user');
    if (token && user) {
        return { access_token: token, user: JSON.parse(user) };
    }
    return null;
}

function saveSession(data) {
    if (data?.access_token) localStorage.setItem('sb-access-token', data.access_token);
    if (data?.refresh_token) localStorage.setItem('sb-refresh-token', data.refresh_token);
    if (data?.user) localStorage.setItem('sb-user', JSON.stringify(data.user));
}

function clearSession() {
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    localStorage.removeItem('sb-user');
}

function authHeaders() {
    var h = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    var token = localStorage.getItem('sb-access-token');
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
}

async function supabaseFetch(url, options) {
    var res = await fetch(url, options);
    if (res.status === 401) {
        var refresh = localStorage.getItem('sb-refresh-token');
        if (refresh) {
            var r = await fetch(AUTH_URL + '/token?grant_type=refresh_token', {
                method: 'POST',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refresh })
            });
            if (r.ok) {
                var rd = await r.json();
                saveSession(rd);
                options.headers['Authorization'] = 'Bearer ' + rd.access_token;
                res = await fetch(url, options);
            }
        }
    }
    if (!res.ok) {
        var err = await res.json().catch(function() { return { message: res.statusText }; });
        throw new Error(err.msg || err.message || err.error || 'Request failed');
    }
    if (res.status === 204) return null;
    try { return await res.json(); } catch(e) { return null; }
}
