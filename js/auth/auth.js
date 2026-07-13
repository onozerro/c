async function loginUser(email, password) {
    var LS_KEY = 'crvx_login_attempts';
    var attempts = [];
    try {
        var raw = localStorage.getItem(LS_KEY);
        if (raw) attempts = JSON.parse(raw) || [];
    } catch(e) {}
    attempts = attempts.filter(function(a) { return a > Date.now() - 900000; });
    if (attempts.length >= 5) {
        var wait = Math.ceil((attempts[0] + 900000 - Date.now()) / 60000);
        throw new Error('Too many attempts. Try again in ' + wait + ' min.');
    }
    try {
        var allowed = await supabaseFetch(API_URL + '/rpc/check_login_rate_limit', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ p_identifier: email })
        });
        if (allowed === false) throw new Error('Too many attempts. Try again later.');
    } catch(e) {
        if (e.message === 'Too many attempts. Try again later.') throw e;
    }
    attempts.push(Date.now());
    try { localStorage.setItem(LS_KEY, JSON.stringify(attempts)); } catch(e) {}
    var res = await fetch(AUTH_URL + '/token?grant_type=password', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    });
    if (!res.ok) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(attempts)); } catch(e) {}
        throw new Error('Invalid username or password');
    }
    try { localStorage.removeItem(LS_KEY); } catch(e) {}
    var data = await res.json();
    saveSession(data);
    return data;
}

async function registerUser(email, password, username, inviteCode) {
    var valid = await supabaseFetch(API_URL + '/rpc/check_invite_code', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_code: inviteCode.toUpperCase() })
    });
    if (!valid) throw new Error('Invalid or used invite code');

    var res = await fetch(AUTH_URL + '/signup', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: email,
            password: password,
            data: { username: username, display_name: username }
        })
    });
    if (!res.ok) throw new Error('Registration failed');
    var data = await res.json();

    if (data?.user?.id) {
        try {
            await supabaseFetch(API_URL + '/rpc/use_invite_code', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ code_to_use: inviteCode.toUpperCase(), user_id: data.user.id })
            });
        } catch(e) {}

        var userNumber = data.user.id;
        for (var attempt = 0; attempt < 5 && userNumber === data.user.id; attempt++) {
            try {
                var prof = await supabaseFetch(API_URL + '/profiles?select=user_number&id=eq.' + encodeURIComponent(data.user.id) + '&limit=1', { headers: authHeaders() });
                if (prof && prof.length > 0 && prof[0].user_number != null) {
                    userNumber = prof[0].user_number;
                }
            } catch (e) {}
            if (userNumber === data.user.id) await new Promise(function (r) { setTimeout(r, 500); });
        }

        await notifyNewUserWebhook(username, email, userNumber);
    }
    return data;
}

async function logoutUser() {
    try {
        await fetch(AUTH_URL + '/logout', { method: 'POST', headers: authHeaders() });
    } catch(e) {}
    clearSession();
    window.location.href = '/';
}

async function getProfile(userId) {
    var data = await supabaseFetch(API_URL + '/profiles?select=*&id=eq.' + encodeURIComponent(userId) + '&limit=1', { headers: authHeaders() });
    if (!data || data.length === 0) throw new Error('Profile not found');
    return data[0];
}

async function getProfileByUsername(username) {
    var data = await supabaseFetch(API_URL + '/profiles?select=*&username=eq.' + encodeURIComponent(username) + '&limit=1', { headers: authHeaders() });
    if (!data || data.length === 0) throw new Error('Profile not found');
    return data[0];
}

async function getProfileByUserNumber(userNumber) {
    var data = await supabaseFetch(API_URL + '/profiles?select=*&user_number=eq.' + encodeURIComponent(userNumber) + '&limit=1', { headers: authHeaders() });
    if (!data || data.length === 0) throw new Error('Profile not found');
    return data[0];
}

async function updateProfile(userId, updates) {
    var data = await supabaseFetch(API_URL + '/profiles?id=eq.' + encodeURIComponent(userId), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates)
    });
    return data;
}

async function searchUsers(query) {
    return supabaseFetch(API_URL + '/profiles?select=*&username=ilike.*' + encodeURIComponent(query) + '*&limit=20', { headers: authHeaders() });
}
