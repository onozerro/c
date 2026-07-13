async function getFriends(userId) {
    var f1 = await supabaseFetch(API_URL + '/friends?select=friend_id,profiles!friends_friend_id_fkey(id,user_number,username,avatar_url,headshot_url,is_verified)&user_id=eq.' + userId, { headers: authHeaders() });
    var f2 = await supabaseFetch(API_URL + '/friends?select=user_id,profiles!friends_user_id_fkey(id,user_number,username,avatar_url,headshot_url,is_verified)&friend_id=eq.' + userId, { headers: authHeaders() });
    var list = [];
    (f1||[]).forEach(function(f) { if (f.profiles) list.push(f.profiles); });
    (f2||[]).forEach(function(f) { if (f.profiles) list.push(f.profiles); });
    return list;
}

async function sendFriendRequest(senderId, receiverId) {
    if (String(senderId) === String(receiverId)) throw new Error('Cannot add yourself as a friend');
    var existing = await supabaseFetch(API_URL + '/friend_requests?select=id,status&sender_id=eq.' + senderId + '&receiver_id=eq.' + receiverId + '&limit=1', { headers: authHeaders() });
    if (existing && existing[0]) {
        if (existing[0].status === 'declined') {
            return supabaseFetch(API_URL + '/friend_requests?id=eq.' + existing[0].id, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ status: 'pending' })
            });
        }
        throw new Error('Request already sent');
    }
    return supabaseFetch(API_URL + '/friend_requests', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sender_id: senderId, receiver_id: receiverId })
    });
}

async function getFriendRequests(userId) {
    return supabaseFetch(API_URL + '/friend_requests?select=*,sender:profiles!friend_requests_sender_id_fkey(id,user_number,username,avatar_url,headshot_url,is_verified)&receiver_id=eq.' + userId + '&status=eq.pending', { headers: authHeaders() });
}

async function getSentRequests(userId) {
    return supabaseFetch(API_URL + '/friend_requests?select=*,receiver:profiles!friend_requests_receiver_id_fkey(id,user_number,username,avatar_url,headshot_url,is_verified)&sender_id=eq.' + userId, { headers: authHeaders() });
}

async function acceptFriendRequest(requestId) {
    var req = await supabaseFetch(API_URL + '/friend_requests?id=eq.' + requestId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'accepted' })
    });
    var r = await supabaseFetch(API_URL + '/friend_requests?select=*&id=eq.' + requestId + '&limit=1', { headers: authHeaders() });
    if (r && r[0]) {
        await supabaseFetch(API_URL + '/friends', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ user_id: r[0].sender_id, friend_id: r[0].receiver_id })
        });
    }
    return req;
}

async function declineFriendRequest(requestId) {
    return supabaseFetch(API_URL + '/friend_requests?id=eq.' + requestId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'declined' })
    });
}

async function removeFriend(userId, friendId) {
    return supabaseFetch(API_URL + '/friends?or=(and(user_id.eq.' + userId + ',friend_id.eq.' + friendId + '),and(user_id.eq.' + friendId + ',friend_id.eq.' + userId + '))', {
        method: 'DELETE',
        headers: authHeaders()
    });
}

async function getFriendStatus(myId, otherId) {
    var req = await supabaseFetch(API_URL + '/friend_requests?select=*&or=(and(sender_id.eq.' + myId + ',receiver_id.eq.' + otherId + '),and(sender_id.eq.' + otherId + ',receiver_id.eq.' + myId + '))&limit=1', { headers: authHeaders() });
    if (!req || req.length === 0) return 'none';
    var r = req[0];
    if (r.status === 'accepted') return 'friends';
    if (r.status === 'pending' && r.sender_id === myId) return 'sent';
    if (r.status === 'pending' && r.receiver_id === myId) return 'received';
    return 'none';
}

async function getAllUsers() {
    return supabaseFetch(API_URL + '/profiles?select=*&order=created_at.desc', { headers: authHeaders() });
}

async function adminBanUser(targetUserId, reason, bannerId) {
    return supabaseFetch(API_URL + '/rpc/ban_user', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ target_user_id: targetUserId, reason: reason, banner_id: bannerId })
    });
}

async function adminUnbanUser(targetUserId) {
    return supabaseFetch(API_URL + '/rpc/unban_user', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ target_user_id: targetUserId })
    });
}

async function adminUpdateUser(targetUserId, data) {
    return supabaseFetch(API_URL + '/profiles?id=eq.' + targetUserId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
}

async function adminCreateInviteCode(creatorId) {
    return supabaseFetch(API_URL + '/rpc/generate_invite_code', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ creator_id: creatorId })
    });
}

async function getInviteCodes() {
    return supabaseFetch(API_URL + '/invite_codes?select=*,creator:profiles!invite_codes_created_by_fkey(username)&order=created_at.desc', { headers: authHeaders() });
}

async function getBans() {
    return supabaseFetch(API_URL + '/bans?select=*,user:profiles!bans_user_id_fkey(username),banner:profiles!bans_banned_by_fkey(username)&order=created_at.desc', { headers: authHeaders() });
}

async function getAds() {
    return supabaseFetch(API_URL + '/ads?select=*&order=created_at.desc', { headers: authHeaders() });
}

async function getActiveAds() {
    return supabaseFetch(API_URL + '/ads?select=*&is_active=eq.true', { headers: authHeaders() });
}

var ALLOWED_EXTENSIONS = ['png','jpg','jpeg','gif','webp','svg','bmp'];

function validateFileType(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
        throw new Error('File type .' + ext + ' is not allowed. Allowed: ' + ALLOWED_EXTENSIONS.join(', '));
    }
}

async function uploadAd(file) {
    validateFileType(file);
    var ext = file.name.split('.').pop();
    var uid = (function(){ try { return (JSON.parse(localStorage.getItem('sb-user')||'{}')).id; } catch(e){ return null; } })();
    var fileName = (uid ? uid + '/' : '') + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
    var formData = new FormData();
    formData.append('file', file);
    var token = localStorage.getItem('sb-access-token');
    var uploadRes = await fetch(STORAGE_URL + '/object/ads/' + fileName, {
        method: 'POST',
        headers: { 'authorization': 'Bearer ' + token, 'x-upsert': 'true' },
        body: file
    });
    if (!uploadRes.ok) {
        var err = await uploadRes.text();
        throw new Error('Upload failed: ' + err);
    }
    var publicUrl = STORAGE_URL + '/object/public/ads/' + fileName;
    return supabaseFetch(API_URL + '/ads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ image_url: publicUrl, alt_text: '', ad_type: 'admin', is_active: false })
    });
}

async function toggleAd(adId, isActive) {
    return supabaseFetch(API_URL + '/ads?id=eq.' + adId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: isActive })
    });
}

async function deleteAd(adId) {
    return supabaseFetch(API_URL + '/ads?id=eq.' + adId, {
        method: 'DELETE',
        headers: authHeaders()
    });
}

async function fetchPublicAds(query) {
    var res = await fetch(API_URL + query, { headers: { 'apikey': supabaseAnonKey } });
    var data = await res.json();
    if (!res.ok || (data && data.code && !Array.isArray(data))) return [];
    return filterRunningAds(Array.isArray(data) ? data : []);
}

async function getBannerAds() {
    var ads = await fetchPublicAds('/ads?select=*&is_active=eq.true&ad_type=in.(banner,admin)&limit=50');
    if (ads.length) return ads;
    return fetchPublicAds('/ads?select=*&is_active=eq.true&limit=50');
}

async function getSkyscraperAds() {
    var ads = await fetchPublicAds('/ads?select=*&is_active=eq.true&ad_type=eq.skyscraper&limit=50');
    return ads;
}

async function loadRandomAd() {
    var slot = document.getElementById('ad-slot');
    if (!slot) return;
    try {
        var ads = await getBannerAds();
        if (!ads || ads.length === 0) { slot.innerHTML = ''; slot.style.minHeight = '0'; return; }
        var ad = ads[Math.floor(Math.random() * ads.length)];
        slot.style.minHeight = '90px';
        slot.innerHTML = '<div class="banner-ad-wrap">' + renderAdHtml(ad, '728px', '90px') + '</div>';
    } catch(e) { slot.innerHTML = ''; slot.style.minHeight = '0'; }
}

function getAdClickUrl(ad) {
    if (ad.click_url) return ad.click_url;
    if (ad.target_type === 'game' && ad.target_id) return 'game-page.html?id=' + ad.target_id;
    if (ad.target_type === 'group' && ad.target_id) return 'groups.html?gid=' + ad.target_id;
    return '#';
}

function getAdSlotSize(adType) {
    if (adType === 'skyscraper') return { w: '160px', h: '600px' };
    if (adType === 'rectangle') return { w: '300px', h: '250px' };
    return { w: '728px', h: '90px' };
}

function filterRunningAds(ads) {
    var now = Date.now();
    return (ads || []).filter(function(a) {
        if (a.ad_type === 'admin') return !!a.is_active;
        if (!a.is_active) return false;
        if (!a.run_until) return true;
        return new Date(a.run_until).getTime() > now;
    });
}

function renderAdHtml(ad, maxW, maxH) {
    var url = getAdClickUrl(ad);
    var size = getAdSlotSize(ad && ad.ad_type);
    var w = maxW || size.w;
    var h = maxH || size.h;
    var img = '<img src="' + ad.image_url + '" alt="' + (ad.alt_text || 'Advertisement') + '" class="sponsor-ad-img" style="width:' + w + ';height:' + h + ';display:block;object-fit:cover;"/>';
    if (url && url !== '#') return '<a href="' + url + '" class="sponsor-ad-link">' + img + '</a>';
    return img;
}

function renderSkyscraperSlot(ad) {
    if (!ad) {
        return '<div class="skyscraper-ad-slot"><div class="skyscraper-ad-inner"><span class="skyscraper-ad-label">Your ad here.</span><span class="skyscraper-ad-size">160 x 600</span></div></div>';
    }
    return '<div class="skyscraper-ad-slot skyscraper-ad-filled">' + renderAdHtml(ad, '160px', '600px') + '</div>';
}

async function loadSkyscraperAds() {
    var left = document.getElementById('ad-sky-left');
    var right = document.getElementById('ad-sky-right');
    if (!left && !right) return;
    try {
        var ads = await getSkyscraperAds();
        if (!ads || ads.length === 0) {
            if (left) left.innerHTML = renderSkyscraperSlot(null);
            if (right) right.innerHTML = renderSkyscraperSlot(null);
            return;
        }
        var pick = function(exclude) {
            var pool = ads.filter(function(a) { return !exclude || a.id !== exclude.id; });
            if (!pool.length) pool = ads;
            return pool[Math.floor(Math.random() * pool.length)];
        };
        var adL = pick(null);
        var adR = ads.length > 1 ? pick(adL) : adL;
        if (left) left.innerHTML = renderSkyscraperSlot(adL);
        if (right) right.innerHTML = renderSkyscraperSlot(adR);
    } catch(e) {
        if (left) left.innerHTML = renderSkyscraperSlot(null);
        if (right) right.innerHTML = renderSkyscraperSlot(null);
    }
}

async function getRectangleAds() {
    return fetchPublicAds('/ads?select=*&is_active=eq.true&ad_type=eq.rectangle&limit=50');
}

function renderRectangleSlot(ad) {
    if (!ad) {
        return '<div class="rectangle-ad-slot"><div class="rectangle-ad-inner"><span class="rectangle-ad-label">Your ad here.</span><span class="rectangle-ad-size">300 x 250</span></div></div>';
    }
    return '<div class="rectangle-ad-slot rectangle-ad-filled">' + renderAdHtml(ad, '300px', '250px') + '</div>';
}

async function loadRectangleAd() {
    var slots = document.querySelectorAll('[id^="ad-rectangle-slot"]');
    if (!slots.length) return;
    try {
        var ads = await getRectangleAds();
        slots.forEach(function(s) {
            if (!ads || !ads.length) {
                s.innerHTML = renderRectangleSlot(null);
                return;
            }
            var picked = ads[Math.floor(Math.random() * ads.length)];
            s.innerHTML = renderRectangleSlot(picked);
        });
    } catch(e) {
        slots.forEach(function(s) { s.innerHTML = renderRectangleSlot(null); });
    }
}

function loadPageAds() {
    var path = window.location.pathname.split('/').pop() || 'home.html';
    if (path === 'home.html') loadSkyscraperAds();
    else if (path === 'games.html') { loadRandomAd(); loadRectangleAd(); }
    else loadRandomAd();
}

async function claimDailyRoCoin() {
    return supabaseFetch(API_URL + '/rpc/claim_daily_ro_coin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({})
    });
}

async function getCurrencyTransactions(userId) {
    return supabaseFetch(API_URL + '/currency_transactions?select=*&user_id=eq.' + userId + '&order=created_at.desc&limit=50', { headers: authHeaders() });
}

async function getDailyClaimStatus(userId) {
    var data = await supabaseFetch(API_URL + '/daily_claims?select=last_claim_date&user_id=eq.' + userId + '&limit=1', { headers: authHeaders() });
    if (!data || !data.length) return { claimedToday: false };
    var today = new Date().toISOString().slice(0, 10);
    return { claimedToday: data[0].last_claim_date === today };
}

async function getMyUserAds(creatorId) {
    return supabaseFetch(API_URL + '/ads?select=*&creator_id=eq.' + creatorId + '&ad_type=neq.admin&order=created_at.desc', { headers: authHeaders() });
}

async function createUserAd(data) {
    return supabaseFetch(API_URL + '/ads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
}

async function toggleUserAd(adId, isActive) {
    return supabaseFetch(API_URL + '/ads?id=eq.' + adId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: isActive, updated_at: new Date().toISOString() })
    });
}

async function runUserAd(adId, robux) {
    return supabaseFetch(API_URL + '/rpc/run_user_ad', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_ad_id: adId, p_robux: robux })
    });
}

async function stopUserAd(adId) {
    return supabaseFetch(API_URL + '/rpc/stop_user_ad', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_ad_id: adId })
    });
}

function isAdRunning(ad) {
    if (!ad || !ad.is_active) return false;
    if (ad.ad_type === 'admin') return true;
    if (!ad.run_until) return true;
    return new Date(ad.run_until).getTime() > Date.now();
}

function formatAdTypeLabel(t) {
    if (t === 'skyscraper') return '160 × 600 Skyscraper';
    if (t === 'rectangle') return '300 × 250 Rectangle';
    if (t === 'banner') return '728 × 90 Banner';
    return t || 'Ad';
}

async function adminSetUserRole(userId, roles) {
    return supabaseFetch(API_URL + '/rpc/set_user_role', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            target_user_id: userId,
            p_is_admin: roles.is_admin,
            p_is_moderator: roles.is_moderator,
            p_is_item_admin: roles.is_item_admin
        })
    });
}

function hasAdminAccess(profile) {
    if (!profile) return false;
    return !!(profile.is_admin || profile.is_moderator || profile.is_item_admin);
}

function getAdminTabAccess(profile) {
    if (!profile) return {};
    if (profile.is_admin) {
        return { users: true, invites: true, bans: true, ads: true, items: true, games: true, forum: true, alert: true, groups: true };
    }
    return {
        users: false, invites: false, bans: false,
        ads: !!profile.is_moderator,
        items: !!(profile.is_item_admin),
        games: false,
        forum: !!profile.is_moderator,
        alert: false
    };
}

async function getItems() {
    return supabaseFetch(API_URL + '/items?select=*&order=created_at.desc', { headers: authHeaders() });
}

var ITEM_CREATOR_SELECT = '*,creator:profiles!items_creator_id_fkey(id,username,display_name,user_number,headshot_url,avatar_url)';

async function getItem(itemId) {
    var data = await supabaseFetch(API_URL + '/items?select=' + ITEM_CREATOR_SELECT + '&id=eq.' + itemId + '&limit=1', { headers: authHeaders() });
    return data && data[0] ? data[0] : null;
}

async function createItem(data) {
    return supabaseFetch(API_URL + '/items', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
}

async function updateItem(itemId, data) {
    return supabaseFetch(API_URL + '/items?id=eq.' + itemId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
}

async function deleteItem(itemId) {
    return supabaseFetch(API_URL + '/rpc/delete_item_admin', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ p_item_id: itemId })
    });
}

async function uploadItemFile(file, bucket) {
    validateFileType(file);
    var ext = file.name.split('.').pop();
    var uid = (function(){ try { return (JSON.parse(localStorage.getItem('sb-user')||'{}')).id; } catch(e){ return null; } })();
    var fileName = (uid ? uid + '/' : '') + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
    var token = localStorage.getItem('sb-access-token');
    var uploadRes = await fetch(STORAGE_URL + '/object/' + bucket + '/' + fileName, {
        method: 'POST',
        headers: { 'authorization': 'Bearer ' + token, 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
        body: file
    });
    if (!uploadRes.ok) {
        var err = await uploadRes.text();
        throw new Error('Upload failed (' + uploadRes.status + '): ' + err);
    }
    return STORAGE_URL + '/object/public/' + bucket + '/' + fileName;
}

async function buyItem(itemId) {
    return supabaseFetch(API_URL + '/rpc/buy_item', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_item_id: itemId })
    });
}

async function getGames() {
    return supabaseFetch(API_URL + '/games?select=*,creator:profiles!games_creator_id_fkey(id,user_number,username,avatar_url,headshot_url,is_verified)&order=created_at.desc', { headers: authHeaders() });
}

async function getUserGames(creatorId) {
    return supabaseFetch(API_URL + '/games?select=*,creator:profiles!games_creator_id_fkey(id,user_number,username,avatar_url,headshot_url,is_verified)&creator_id=eq.' + creatorId + '&order=created_at.desc', { headers: authHeaders() });
}

async function getGame(gameId) {
    var data = await supabaseFetch(API_URL + '/games?select=*,creator:profiles!games_creator_id_fkey(id,user_number,username,avatar_url,headshot_url,is_verified)&id=eq.' + gameId + '&limit=1', { headers: authHeaders() });
    return data && data[0] ? data[0] : null;
}

async function createGame(data) {
    return supabaseFetch(API_URL + '/games', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
}

async function deleteGroup(groupId) {
    return supabaseFetch(API_URL + '/groups?id=eq.' + groupId, {
        method: 'DELETE',
        headers: authHeaders()
    });
}

async function updateGame(gameId, data) {
    return supabaseFetch(API_URL + '/games?id=eq.' + gameId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
}

async function deleteGame(gameId) {
    return supabaseFetch(API_URL + '/games?id=eq.' + gameId, {
        method: 'DELETE',
        headers: authHeaders()
    });
}

async function castVote(gameId, vote) {
    return supabaseFetch(API_URL + '/rpc/vote_game', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_game_id: gameId, p_vote: vote })
    });
}

async function uploadGameThumbnail(file) {
    validateFileType(file);
    var ext = file.name.split('.').pop();
    var uid = (function(){ try { return (JSON.parse(localStorage.getItem('sb-user')||'{}')).id; } catch(e){ return null; } })();
    var fileName = (uid ? uid + '/' : '') + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
    var token = localStorage.getItem('sb-access-token');
    var uploadRes = await fetch(STORAGE_URL + '/object/games/' + fileName, {
        method: 'POST',
        headers: { 'authorization': 'Bearer ' + token, 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
        body: file
    });
    if (!uploadRes.ok) {
        var err = await uploadRes.text();
        throw new Error('Upload failed (' + uploadRes.status + '): ' + err);
    }
    return STORAGE_URL + '/object/public/games/' + fileName;
}

async function getUserInventory(userId) {
    return supabaseFetch(API_URL + '/inventory?select=*,item_id,item:items(*,creator:profiles!items_creator_id_fkey(id,username,user_number))&user_id=eq.' + userId + '&order=purchased_at.desc', { headers: authHeaders() });
}

async function equipItem(inventoryId, equip) {
    return supabaseFetch(API_URL + '/inventory?id=eq.' + inventoryId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ equipped: equip })
    });
}

async function getGroups() {
    return supabaseFetch(API_URL + '/groups?select=*,owner:profiles!groups_owner_id_fkey(id,user_number,username,headshot_url,avatar_url)&order=created_at.desc', { headers: authHeaders() });
}

async function getUserGroups(userId) {
    return supabaseFetch(API_URL + '/group_members?select=*,group:groups(*)&user_id=eq.' + userId, { headers: authHeaders() });
}

async function getGroup(groupId) {
    var data = await supabaseFetch(API_URL + '/groups?select=*,owner:profiles!groups_owner_id_fkey(id,user_number,username,headshot_url,avatar_url)&id=eq.' + groupId + '&limit=1', { headers: authHeaders() });
    return data && data[0] ? data[0] : null;
}

async function createGroup(name, description, emblemUrl) {
    return supabaseFetch(API_URL + '/rpc/create_group', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_name: name, p_description: description || '', p_emblem_url: emblemUrl || '' })
    });
}

async function uploadGroupEmblem(file) {
    return uploadItemFile(file, 'items');
}

async function getGroupMemberCount(groupId) {
    var data = await supabaseFetch(API_URL + '/group_members?select=id&group_id=eq.' + groupId, { headers: authHeaders() });
    return (data || []).length;
}

async function leaveGroup(groupId) {
    return supabaseFetch(API_URL + '/group_members?group_id=eq.' + groupId + '&user_id=eq.' + currentProfile.id, {
        method: 'DELETE',
        headers: authHeaders()
    });
}

async function getGroupMembers(groupId, rankName) {
    var url = API_URL + '/group_members?select=*,user:profiles!group_members_user_id_fkey(id,user_number,username,headshot_url,avatar_url)&group_id=eq.' + groupId;
    if (rankName) url += '&rank_name=eq.' + encodeURIComponent(rankName);
    url += '&order=joined_at.desc';
    return supabaseFetch(url, { headers: authHeaders() });
}

async function getGroupRanks(groupId) {
    var members = await supabaseFetch(API_URL + '/group_members?select=rank,rank_name&group_id=eq.' + groupId, { headers: authHeaders() });
    var ranks = {};
    (members || []).forEach(function(m) {
        var rn = m.rank_name || 'Member';
        if (!ranks[rn]) ranks[rn] = { name: rn, rank: m.rank, count: 0 };
        ranks[rn].count++;
    });
    return Object.values(ranks).sort(function(a, b) { return b.rank - a.rank; });
}

async function setPrimaryGroup(groupId) {
    var all = await supabaseFetch(API_URL + '/group_members?select=id&user_id=eq.' + currentProfile.id + '&is_primary=eq.true', { headers: authHeaders() });
    if (all && all.length) {
        await supabaseFetch(API_URL + '/group_members?user_id=eq.' + currentProfile.id + '&is_primary=eq.true', {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ is_primary: false })
        });
    }
    return supabaseFetch(API_URL + '/group_members?group_id=eq.' + groupId + '&user_id=eq.' + currentProfile.id, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_primary: true })
    });
}

async function removePrimaryGroup() {
    return supabaseFetch(API_URL + '/group_members?user_id=eq.' + currentProfile.id + '&is_primary=eq.true', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_primary: false })
    });
}

async function searchGroupsByName(query) {
    if (!query || !query.trim()) return getGroups();
    return supabaseFetch(API_URL + '/groups?select=*,owner:profiles!groups_owner_id_fkey(id,user_number,username,headshot_url,avatar_url)&name=ilike.*' + encodeURIComponent(query.trim()) + '*&order=created_at.desc', { headers: authHeaders() });
}

async function getGroupWallPosts(groupId) {
    return supabaseFetch(API_URL + '/group_wall_posts?select=*,author:profiles!group_wall_posts_author_id_fkey(id,user_number,username,headshot_url,avatar_url)&group_id=eq.' + groupId + '&order=created_at.desc&limit=20', { headers: authHeaders() });
}

async function postGroupWall(groupId, body) {
    return supabaseFetch(API_URL + '/group_wall_posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ group_id: groupId, author_id: currentProfile.id, body: body })
    });
}

async function deleteGroupWallPost(postId) {
    return supabaseFetch(API_URL + '/group_wall_posts?id=eq.' + postId, {
        method: 'DELETE',
        headers: authHeaders()
    });
}

async function joinGroup(groupId) {
    return supabaseFetch(API_URL + '/rpc/join_group', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_group_id: groupId })
    });
}

async function updateGroupInfo(groupId, data) {
    return supabaseFetch(API_URL + '/groups?id=eq.' + groupId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
}

async function kickGroupMember(groupId, userId) {
    return supabaseFetch(API_URL + '/rpc/kick_group_member', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_group_id: groupId, p_user_id: userId })
    });
}

async function setGroupMemberRank(groupId, userId, rankName, rank) {
    return supabaseFetch(API_URL + '/rpc/set_group_member_rank', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_group_id: groupId, p_user_id: userId, p_rank_name: rankName, p_rank: rank })
    });
}

async function getGroupJoinRequests(groupId) {
    return supabaseFetch(API_URL + '/group_join_requests?select=*,user:profiles!group_join_requests_user_id_fkey(id,user_number,username,headshot_url)&group_id=eq.' + groupId + '&status=eq.pending&order=created_at.asc', { headers: authHeaders() });
}

async function approveGroupJoinRequest(requestId) {
    return supabaseFetch(API_URL + '/rpc/approve_group_join', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_request_id: requestId })
    });
}

async function declineGroupJoinRequest(requestId) {
    return supabaseFetch(API_URL + '/group_join_requests?id=eq.' + requestId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'declined' })
    });
}

async function getAssetComments(assetType, assetId, limit, offset) {
    var url = API_URL + '/asset_comments?select=*,author:profiles!asset_comments_author_id_fkey(id,user_number,username,headshot_url,avatar_url)';
    url += '&asset_type=eq.' + assetType + '&asset_id=eq.' + encodeURIComponent(String(assetId));
    url += '&order=created_at.desc&limit=' + (limit || 10) + '&offset=' + (offset || 0);
    return supabaseFetch(url, { headers: authHeaders() });
}

async function postAssetComment(assetType, assetId, body) {
    return supabaseFetch(API_URL + '/asset_comments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            asset_type: assetType,
            asset_id: String(assetId),
            author_id: currentProfile.id,
            body: body
        })
    });
}

async function getForumCategories() {
    return supabaseFetch(API_URL + '/forum_categories?select=*,forum_subcategories(*)&order=sort_order.asc', { headers: authHeaders() });
}

async function getForumSubcategory(subId) {
    var data = await supabaseFetch(API_URL + '/forum_subcategories?select=*&id=eq.' + subId + '&limit=1', { headers: authHeaders() });
    return data && data[0] ? data[0] : null;
}

async function getForumThreads(subId) {
    return supabaseFetch(API_URL + '/forum_threads?select=*,author:profiles!forum_threads_author_id_fkey(id,user_number,username,headshot_url,avatar_url)&subcategory_id=eq.' + subId + '&order=is_pinned.desc,updated_at.desc', { headers: authHeaders() });
}

async function getForumThread(threadId) {
    var data = await supabaseFetch(API_URL + '/forum_threads?select=*,author:profiles!forum_threads_author_id_fkey(id,user_number,username,headshot_url,avatar_url),subcategory:forum_subcategories(name)&id=eq.' + threadId + '&limit=1', { headers: authHeaders() });
    return data && data[0] ? data[0] : null;
}

async function getForumPosts(threadId) {
    return supabaseFetch(API_URL + '/forum_posts?select=*,author:profiles!forum_posts_author_id_fkey(id,user_number,username,headshot_url,avatar_url,is_verified)&thread_id=eq.' + threadId + '&order=created_at.asc', { headers: authHeaders() });
}

async function getForumStats(subId) {
    var threads = await supabaseFetch(API_URL + '/forum_threads?select=id&subcategory_id=eq.' + subId, { headers: authHeaders() });
    var threadCount = (threads || []).length;
    var postCount = 0;
    if (threadCount > 0) {
        var ids = threads.map(function(t) { return t.id; }).join(',');
        var posts = await supabaseFetch(API_URL + '/forum_posts?select=id&thread_id=in.(' + ids + ')', { headers: authHeaders() });
        postCount = (posts || []).length;
    }
    var lastPost = null;
    if (threadCount > 0) {
        var lp = await supabaseFetch(API_URL + '/forum_posts?select=*,author:profiles!forum_posts_author_id_fkey(username),thread_id&thread_id=in.(' + threads.map(function(t){return t.id;}).join(',') + ')&order=created_at.desc&limit=1', { headers: authHeaders() });
        if (lp && lp[0]) lastPost = lp[0];
    }
    return { threadCount: threadCount, postCount: postCount, lastPost: lastPost };
}

async function createForumThread(subId, title, body) {
    var thread = await supabaseFetch(API_URL + '/forum_threads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ subcategory_id: subId, title: title, author_id: currentProfile.id })
    });
    var threads = await supabaseFetch(API_URL + '/forum_threads?select=id&subcategory_id=eq.' + subId + '&author_id=eq.' + currentProfile.id + '&order=created_at.desc&limit=1', { headers: authHeaders() });
    if (threads && threads[0]) {
        await supabaseFetch(API_URL + '/forum_posts', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ thread_id: threads[0].id, author_id: currentProfile.id, body: body })
        });
        return threads[0].id;
    }
    return null;
}

async function createForumPost(threadId, body) {
    return supabaseFetch(API_URL + '/forum_posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ thread_id: threadId, author_id: currentProfile.id, body: body })
    });
}

async function adminGetForumThreads() {
    return supabaseFetch(API_URL + '/forum_threads?select=*,author:profiles!forum_threads_author_id_fkey(username),subcategory:forum_subcategories(name)&order=updated_at.desc&limit=200', { headers: authHeaders() });
}

async function adminUpdateForumThread(threadId, data) {
    data.updated_at = new Date().toISOString();
    return supabaseFetch(API_URL + '/forum_threads?id=eq.' + threadId, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
}

async function adminDeleteForumThread(threadId) {
    return supabaseFetch(API_URL + '/forum_threads?id=eq.' + threadId, {
        method: 'DELETE',
        headers: authHeaders()
    });
}

async function adminDeleteForumPost(postId) {
    return supabaseFetch(API_URL + '/forum_posts?id=eq.' + postId, {
        method: 'DELETE',
        headers: authHeaders()
    });
}

var MAX_TRADE_ITEMS_PER_SIDE = 4;
var TRADE_SEND_COOLDOWN_MS = 3000;
var lastTradeSendAt = 0;

function normalizeTrade(t) {
    if (!t) return t;
    var items = t.trade_items || [];
    function mapTradeItem(i) {
        var inv = i.inventory || {};
        var item = inv.item || {};
        return {
            tradeItemId: i.id,
            inventoryId: inv.id,
            ownerId: inv.user_id,
            itemId: item.id,
            assetId: item.id,
            name: item.name,
            image_url: item.image_url,
            price: item.price,
            recentAveragePrice: item.price || 0,
            originalPrice: item.price || 0,
            serialNumber: inv.serial_number || '',
            assetStock: item.serial_count || ''
        };
    }
    return {
        id: t.id,
        status: t.status,
        sender_id: t.sender_id,
        receiver_id: t.receiver_id,
        sender_rocoin: t.sender_rocoin || 0,
        receiver_rocoin: t.receiver_rocoin || 0,
        message: t.message || '',
        created_at: t.created_at,
        updated_at: t.updated_at,
        sender: t.sender,
        receiver: t.receiver,
        senderItems: items.filter(function (i) { return i.side === 'sender'; }).map(mapTradeItem),
        receiverItems: items.filter(function (i) { return i.side === 'receiver'; }).map(mapTradeItem)
    };
}

async function getTrades(userId) {
    var rows = await supabaseFetch(API_URL + '/trades?select=*,trade_items(id,side,inventory(id,user_id,item:items(id,name,image_url,price))),sender:profiles!trades_sender_id_fkey(id,user_number,username,headshot_url,avatar_url),receiver:profiles!trades_receiver_id_fkey(id,user_number,username,headshot_url,avatar_url)&or=(sender_id.eq.' + userId + ',receiver_id.eq.' + userId + ')&order=created_at.desc', { headers: authHeaders() });
    return (rows || []).map(normalizeTrade);
}

async function getTrade(tradeId) {
    var rows = await supabaseFetch(API_URL + '/trades?select=*,trade_items(id,side,inventory(id,user_id,item:items(id,name,image_url,price))),sender:profiles!trades_sender_id_fkey(id,user_number,username,headshot_url,avatar_url),receiver:profiles!trades_receiver_id_fkey(id,user_number,username,headshot_url,avatar_url)&id=eq.' + tradeId + '&limit=1', { headers: authHeaders() });
    if (!rows || !rows[0]) return null;
    return normalizeTrade(rows[0]);
}

async function getTradableInventory(userId) {
    if (!userId) return [];
    var rows = await supabaseFetch(API_URL + '/rpc/get_tradable_inventory', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_user_id: userId })
    });
    return rows || [];
}

function rpcScalar(res) {
    if (res && Array.isArray(res)) return res[0];
    return res;
}

async function createTrade(receiverId, senderRobux, receiverRobux, message, offerInventoryIds, requestInventoryIds) {
    if (!currentProfile) throw new Error('Not logged in');
    if (String(receiverId) === String(currentProfile.id)) throw new Error('Cannot trade with yourself');
    senderRobux = Math.max(0, parseInt(senderRobux, 10) || 0);
    receiverRobux = Math.max(0, parseInt(receiverRobux, 10) || 0);
    var offer = (offerInventoryIds || []).slice(0, MAX_TRADE_ITEMS_PER_SIDE);
    var request = (requestInventoryIds || []).slice(0, MAX_TRADE_ITEMS_PER_SIDE);
    if (offer.length < 1 || request.length < 1) {
        throw new Error('You must offer and request at least one item.');
    }
    var now = Date.now();
    if (now - lastTradeSendAt < TRADE_SEND_COOLDOWN_MS) {
        throw new Error('Please wait a moment before sending another trade.');
    }
    lastTradeSendAt = now;
    var res;
    try {
        res = await supabaseFetch(API_URL + '/rpc/create_trade', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                p_receiver_id: receiverId,
                p_sender_rocoin: senderRobux,
                p_receiver_rocoin: receiverRobux,
                p_message: (message || '').toString().slice(0, 200)
            })
        });
    } catch (e) {
        res = await supabaseFetch(API_URL + '/rpc/create_trade', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ p_receiver_id: receiverId, p_sender_rocoin: senderRobux })
        });
    }
    var tradeId = rpcScalar(res);
    if (!tradeId) throw new Error('Failed to create trade');
    var all = offer.concat(request);
    for (var i = 0; i < all.length; i++) {
        await supabaseFetch(API_URL + '/rpc/add_trade_item', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ p_trade_id: tradeId, p_inventory_id: all[i] })
        });
    }
    return tradeId;
}

async function addTradeItem(tradeId, inventoryId) {
    return supabaseFetch(API_URL + '/rpc/add_trade_item', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_trade_id: tradeId, p_inventory_id: inventoryId })
    });
}

async function removeTradeItem(tradeId, inventoryId) {
    return supabaseFetch(API_URL + '/rpc/remove_trade_item', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_trade_id: tradeId, p_inventory_id: inventoryId })
    });
}

async function updateTradeStatus(tradeId, status) {
    if (status === 'accepted') {
        return supabaseFetch(API_URL + '/rpc/accept_trade', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ p_trade_id: tradeId })
        });
    }
    if (status === 'declined') {
        return supabaseFetch(API_URL + '/rpc/decline_trade', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ p_trade_id: tradeId })
        });
    }
    if (status === 'cancelled') {
        return supabaseFetch(API_URL + '/rpc/cancel_trade', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ p_trade_id: tradeId })
        });
    }
    throw new Error('Unsupported trade action');
}

function formatNotifCount(num) {
    num = Number(num) || 0;
    if (num > 99) return '99+';
    return String(num);
}

async function getUnreadInboxCount(userId) {
    var rows = await supabaseFetch(API_URL + '/messages?select=id&receiver_id=eq.' + userId + '&is_read=eq.false', { headers: authHeaders() });
    return rows ? rows.length : 0;
}

async function getPendingFriendRequestCount(userId) {
    var rows = await supabaseFetch(API_URL + '/friend_requests?select=id&receiver_id=eq.' + userId + '&status=eq.pending', { headers: authHeaders() });
    return rows ? rows.length : 0;
}

async function getUnreadChatCount(userId) {
    var rows = await supabaseFetch(API_URL + '/chat_messages?select=id&receiver_id=eq.' + userId + '&is_read=eq.false', { headers: authHeaders() });
    return rows ? rows.length : 0;
}

async function getMessages(userId) {
    var rows = await supabaseFetch(API_URL + '/messages?select=*,sender:profiles!messages_sender_id_fkey(username,display_name)&receiver_id=eq.' + userId + '&order=created_at.desc', { headers: authHeaders() });
    return (rows || []).map(function(m) {
        m.sender_name = m.sender ? (m.sender.display_name || m.sender.username) : 'System';
        return m;
    });
}

async function markInboxMessagesRead(userId) {
    return supabaseFetch(
        API_URL + '/messages?receiver_id=eq.' + userId + '&is_read=eq.false',
        { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_read: true }) }
    );
}

async function getChatThread(userId, otherId) {
    return supabaseFetch(
        API_URL + '/chat_messages?select=*&or=(and(sender_id.eq.' + userId + ',receiver_id.eq.' + otherId + '),and(sender_id.eq.' + otherId + ',receiver_id.eq.' + userId + '))&order=created_at.asc&limit=100',
        { headers: authHeaders() }
    );
}

async function getChatConversations(userId) {
    var sent = await supabaseFetch(
        API_URL + '/chat_messages?select=*,receiver:profiles!chat_messages_receiver_id_fkey(id,username,display_name,headshot_url,avatar_url,user_number)&sender_id=eq.' + userId + '&order=created_at.desc&limit=200',
        { headers: authHeaders() }
    );
    var recv = await supabaseFetch(
        API_URL + '/chat_messages?select=*,sender:profiles!chat_messages_sender_id_fkey(id,username,display_name,headshot_url,avatar_url,user_number)&receiver_id=eq.' + userId + '&order=created_at.desc&limit=200',
        { headers: authHeaders() }
    );
    var map = {};
    function addRow(row, other, isUnread) {
        if (!other || !other.id) return;
        var oid = other.id;
        if (!map[oid]) {
            map[oid] = { user: other, latest: row, hasUnread: !!isUnread };
        } else if (new Date(row.created_at) > new Date(map[oid].latest.created_at)) {
            map[oid].latest = row;
        }
        if (isUnread) map[oid].hasUnread = true;
    }
    (sent || []).forEach(function(r) { addRow(r, r.receiver, false); });
    (recv || []).forEach(function(r) { addRow(r, r.sender, !r.is_read); });
    return Object.keys(map).map(function(k) { return map[k]; });
}

async function getAvatarColors() {
  if (!currentProfile) return null;
  return {
    headColorId: currentProfile.head_color_id || 0,
    torsoColorId: currentProfile.torso_color_id || 0,
    leftArmColorId: currentProfile.left_arm_color_id || 0,
    rightArmColorId: currentProfile.right_arm_color_id || 0,
    leftLegColorId: currentProfile.left_leg_color_id || 0,
    rightLegColorId: currentProfile.right_leg_color_id || 0,
  };
}

async function setAvatarColors(colors) {
  if (!currentProfile) throw new Error('Not logged in');
  return supabaseFetch(API_URL + '/profiles?id=eq.' + currentProfile.id, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      head_color_id: colors.headColorId,
      torso_color_id: colors.torsoColorId,
      left_arm_color_id: colors.leftArmColorId,
      right_arm_color_id: colors.rightArmColorId,
      left_leg_color_id: colors.leftLegColorId,
      right_leg_color_id: colors.rightLegColorId,
    })
  });
}

function getAvatarRules() {
  return {
    bodyColorsPalette: [
      { brickColorId: 0, hexColor: '#B2B3B3', name: 'Medium stone grey' },
      { brickColorId: 1, hexColor: '#FE6B6B', name: 'Bright red' },
      { brickColorId: 2, hexColor: '#FFAE5A', name: 'Bright orange' },
      { brickColorId: 3, hexColor: '#FFE05A', name: 'Bright yellow' },
      { brickColorId: 4, hexColor: '#ABDA61', name: 'Bright green' },
      { brickColorId: 5, hexColor: '#53BEE5', name: 'Bright blue' },
      { brickColorId: 6, hexColor: '#C973BF', name: 'Bright violet' },
      { brickColorId: 7, hexColor: '#FCFCFC', name: 'White' },
      { brickColorId: 8, hexColor: '#CC8E5A', name: 'Dark orange' },
      { brickColorId: 9, hexColor: '#E9B59C', name: 'Light reddish violet' },
      { brickColorId: 10, hexColor: '#DC8484', name: 'Pastel blue' },
      { brickColorId: 11, hexColor: '#63B8E3', name: 'Pastel light blue' },
      { brickColorId: 12, hexColor: '#D6B0E0', name: 'Pastel violet' },
      { brickColorId: 13, hexColor: '#C8E0A0', name: 'Pastel green' },
      { brickColorId: 14, hexColor: '#AEE0E0', name: 'Pastel yellow-green' },
      { brickColorId: 15, hexColor: '#A0A0A0', name: 'Pastel brown' },
      { brickColorId: 16, hexColor: '#B0A090', name: 'Reddish brown' },
      { brickColorId: 17, hexColor: '#F0D0A0', name: 'Pastel red-orange' },
      { brickColorId: 18, hexColor: '#E0C090', name: 'Medium yellow' },
      { brickColorId: 19, hexColor: '#D09080', name: 'Pastel yellow-orange' },
      { brickColorId: 20, hexColor: '#F08080', name: 'Pastel orange' },
      { brickColorId: 21, hexColor: '#C08080', name: 'Pastel red' },
      { brickColorId: 22, hexColor: '#A0A080', name: 'Pastel blue-green' },
      { brickColorId: 23, hexColor: '#80A0A0', name: 'Pastel green-blue' },
      { brickColorId: 24, hexColor: '#8080A0', name: 'Yellowish green' },
      { brickColorId: 25, hexColor: '#C0C0A0', name: 'Reddish lilac' },
      { brickColorId: 26, hexColor: '#E0E0A0', name: 'Lilac' },
      { brickColorId: 27, hexColor: '#D0B0A0', name: 'Light orange' },
      { brickColorId: 28, hexColor: '#D0A0C0', name: 'Light blue-violet' },
      { brickColorId: 29, hexColor: '#E0E0C0', name: 'Light yellow' },
      { brickColorId: 30, hexColor: '#B0B0D0', name: 'Light reddish violet' },
      { brickColorId: 31, hexColor: '#C0D0B0', name: 'Light purple' },
      { brickColorId: 32, hexColor: '#A0B0C0', name: 'Light yellow-green' },
      { brickColorId: 33, hexColor: '#808080', name: 'Medium blue' },
      { brickColorId: 34, hexColor: '#606060', name: 'Medium green' },
      { brickColorId: 35, hexColor: '#404040', name: 'Dark grey' },
      { brickColorId: 36, hexColor: '#202020', name: 'Black' },
      { brickColorId: 37, hexColor: '#51A45B', name: 'Dark green' },
      { brickColorId: 38, hexColor: '#4E7AAE', name: 'Medium azure' },
      { brickColorId: 39, hexColor: '#A35D5D', name: 'Dark red' },
      { brickColorId: 40, hexColor: '#D49C5C', name: 'Dark orange' },
      { brickColorId: 41, hexColor: '#B68C6C', name: 'Light brown' },
      { brickColorId: 42, hexColor: '#848484', name: 'Dark stone grey' },
      { brickColorId: 43, hexColor: '#9C9C9C', name: 'Medium stone grey' },
      { brickColorId: 44, hexColor: '#F3C78A', name: 'Light yellow' },
    ]
  };
}

async function getOutfits() {
  if (!currentProfile) return [];
  return supabaseFetch(API_URL + '/outfits?select=*&user_id=eq.' + currentProfile.id + '&order=created_at.desc', { headers: authHeaders() });
}

async function createOutfit(name, assetIds, colors) {
  return supabaseFetch(API_URL + '/rpc/create_outfit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ p_name: name, p_asset_ids: assetIds || [], p_colors: colors || {} })
  });
}

async function renameOutfit(outfitId, name) {
  return supabaseFetch(API_URL + '/rpc/rename_outfit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ p_outfit_id: outfitId, p_name: name })
  });
}

async function deleteOutfit(outfitId) {
  return supabaseFetch(API_URL + '/rpc/delete_outfit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ p_outfit_id: outfitId })
  });
}

async function wearOutfit(outfitId) {
  return supabaseFetch(API_URL + '/rpc/wear_outfit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ p_outfit_id: outfitId })
  });
}

async function sendChatMessage(receiverId, body) {
    if (!currentProfile) throw new Error('Not logged in');
    body = (body || '').trim();
    if (!body || body.length > 255) throw new Error('Invalid message');
    return supabaseFetch(API_URL + '/rpc/send_chat_message', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ p_receiver: receiverId, p_body: body })
    });
}

async function markChatThreadRead(userId, otherId) {
    return supabaseFetch(
        API_URL + '/chat_messages?receiver_id=eq.' + userId + '&sender_id=eq.' + otherId + '&is_read=eq.false',
        { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_read: true }) }
    );
}

async function listItemForResale(inventoryId, price) {
    return supabaseFetch(API_URL + '/rpc/list_item_for_resale', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ p_inventory_id: inventoryId, p_price: price })
    });
}

async function cancelResale(inventoryId) {
    return supabaseFetch(API_URL + '/rpc/cancel_resale', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ p_inventory_id: inventoryId })
    });
}

async function buyResaleItem(inventoryId) {
    return supabaseFetch(API_URL + '/rpc/buy_resale_item', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ p_inventory_id: inventoryId })
    });
}

async function getResaleListings(itemId) {
    var rows = await supabaseFetch(API_URL + '/rpc/get_resale_listings?p_item_id=' + itemId, { headers: authHeaders() });
    return rows || [];
}
