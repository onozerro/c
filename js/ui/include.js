var INLINE_NAVBAR = '<nav class="navbar">\
    <button class="hamburger" type="button" onclick="openSidebar()" aria-label="Menu"><span class="icon-nav-menu"></span></button>\
    <a href="/home/" class="nav-logo"><img src="/images/logo/logo17.png" alt="CORVIXZ"></a>\
    <div class="nav-links">\
        <a href="/games/">Games</a>\
        <a href="/catalog/">Catalog</a>\
        <a href="/develop/">Develop</a>\
        <a href="/forum/">Forum</a>\
    </div>\
    <div class="nav-search">\
        <div class="nav-search-wrap">\
            <input type="text" class="nav-search-input" placeholder="Search">\
            <span class="icon-nav-search"></span>\
        </div>\
    </div>\
    <div class="nav-right">\
        <span class="nav-username" id="navUsername">User: 13+</span>\
        <span id="navRobux"></span>\
        <a href="/messages/" class="nav-icon"><span class="icon-nav-message nav-icon-white"></span></a>\
        <div class="settings-dropdown">\
            <a href="#" class="nav-icon" onclick="toggleSettings(event)"><span class="icon-nav-settings nav-icon-white"></span></a>\
            <div class="nav-settings-menu" id="settingsDropdown">\
                <p class="nav-settings-item"><a href="/settings/">Settings</a></p>\
                <p class="nav-settings-item" id="navAdminLinkWrap" style="display:none;"><a href="/admin/" id="navAdminLink">Admin</a></p>\
                <p class="nav-settings-item"><a href="#" onclick="event.preventDefault();logoutUser();">Logout</a></p>\
            </div>\
        </div>\
    </div>\
</nav>\
<div id="sidebar">\
    <div class="sidebar-body">\
        <p class="sidebar-username" id="sidebarUsername">User</p>\
        <div class="sidebar-divider"></div>\
        <a href="/home/" class="sidebar-link"><span class="corvixz-nav-icon icon-nav-home"></span><span class="sidebar-link-text">Home</span></a>\
        <a href="/profile/" class="sidebar-link" id="sidebarProfile"><span class="corvixz-nav-icon icon-nav-profile"></span><span class="sidebar-link-text">Profile</span></a>\
        <a href="/messages/" class="sidebar-link sidebar-link-notif" id="sidebarMessagesLink"><span class="sidebar-link-main"><span class="corvixz-nav-icon icon-nav-message"></span><span class="sidebar-link-text">Messages</span></span><span class="sidebar-nav-badge" id="sidebarMsgBadge" hidden>0</span></a>\
        <a href="/friends/" class="sidebar-link sidebar-link-notif" id="sidebarFriendsLink"><span class="sidebar-link-main"><span class="corvixz-nav-icon icon-nav-friends"></span><span class="sidebar-link-text">Friends</span></span><span class="sidebar-nav-badge" id="sidebarFriendsBadge" hidden>0</span></a>\
        <a href="/avatar/" class="sidebar-link"><span class="corvixz-nav-icon icon-nav-charactercustomizer"></span><span class="sidebar-link-text">Character</span></a>\
        <a href="/inventory/" class="sidebar-link"><span class="corvixz-nav-icon icon-nav-inventory"></span><span class="sidebar-link-text">Inventory</span></a>\
        <a href="/trade/" class="sidebar-link"><span class="corvixz-nav-icon icon-nav-trade"></span><span class="sidebar-link-text">Trade</span></a>\
        <a href="/groups/" class="sidebar-link"><span class="corvixz-nav-icon icon-nav-group"></span><span class="sidebar-link-text">Groups</span></a>\
        <a href="/forum/" class="sidebar-link"><span class="corvixz-nav-icon icon-nav-forum"></span><span class="sidebar-link-text">Forums</span></a>\
        <a href="/download/" class="sidebar-link"><span class="corvixz-nav-icon icon-nav-shop"></span><span class="sidebar-link-text">Download</span></a>\
        <a href="/admin/" class="sidebar-link" id="sidebarAdminLink" style="display:none;"><span class="corvixz-nav-icon icon-nav-profile"></span><span class="sidebar-link-text">Admin</span></a>\
        <a href="#" class="sidebar-upgrade-btn">Upgrade Now</a>\
    </div>\
</div>\
<div id="sidebarOverlay" class="sidebar-overlay" onclick="closeSidebar()"></div>';

var INLINE_FOOTER = '<footer class="site-footer">\
    <ul class="footer-links">\
        <li><a href="/about/">About Us</a></li>\
        <li><a href="https://discord.gg/RrEJbps8UY" target="_blank">Discord</a></li>\
        <li><a href="/ro-coin/">Ro-coin</a></li>\
        <li><a href="/forum/">Forum</a></li>\
        <li><a href="/terms/">Terms</a></li>\
        <li><a href="/terms/">Privacy</a></li>\
    </ul>\
    <p class="footer-note" id="footerNote">&copy;2026 CORVIXZ. Not affiliated with Roblox Corporation.</p>\
</footer>';

function _hs(s) { var d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }

function openSidebar() { var s = document.getElementById('sidebar'); var o = document.getElementById('sidebarOverlay'); if(s)s.classList.add('open'); if(o)o.classList.add('show'); }
function closeSidebar() { var s = document.getElementById('sidebar'); var o = document.getElementById('sidebarOverlay'); if(s)s.classList.remove('open'); if(o)o.classList.remove('show'); }


function robuxHtml(amount, size, large) {
    size = size || 12;
    var val = (typeof amount === 'number') ? amount.toLocaleString() : String(amount);
    var cls = large ? 'robux-inline robux-inline-lg' : 'robux-inline';
    return '<span class="' + cls + '"><img src="/images/icons/img-robux.png" class="robux-icon-corvixz" height="' + size + '" alt=""/>' +
        '<span class="robux-amount-corvixz">' + val + '</span></span>';
}

function formatNavBalance(value) {
    value = Number(value) || 0;
    if (value < 1000) return value.toLocaleString();
    if (value < 1000000) {
        var k = value / 1000;
        return k.toFixed(1).replace(/\.0$/, '') + 'K';
    }
    var m = value / 1000000;
    return m.toFixed(1).replace(/\.0$/, '') + 'M';
}

function abbreviateNumber(num) {
    return formatNavBalance(num);
}

function navRobuxHtml(amount) {
    return '<img src="/images/logo/ro-coin.png" class="robux-icon-nav-white" width="26" height="26" alt="Ro-coin"/>' +
        '<span class="robux-amount-nav-white">' + formatNavBalance(amount || 0) + '</span>';
}

function toggleSettings(e) {
    e.preventDefault(); e.stopPropagation();
    var dd = document.getElementById('settingsDropdown');
    if (dd) dd.classList.toggle('show');
}

function updateDynamicElements() {
    if (!currentProfile) return;

    var usernameEl = document.getElementById('navUsername');
    if (usernameEl) {
        var name = currentProfile.display_name || currentProfile.username;
        var verifHtml = currentProfile.is_verified ? ' <img src="/images/logo/verif.png" height="14" alt="&#10003;"/>' : '';
        usernameEl.innerHTML = _hs(name) + verifHtml + '<span class="nav-age">: 13+</span>';
    }

    var robuxEl = document.getElementById('navRobux');
    if (robuxEl) {
        var amount = currentProfile.currency || 0;
        robuxEl.innerHTML = '<a href="/ro-coin/" class="nav-robux-link" title="' + amount.toLocaleString() + ' Ro-coin">' + navRobuxHtml(amount) + '</a>';
    }

    var adminLink = document.getElementById('navAdminLink');
    var adminWrap = document.getElementById('navAdminLinkWrap');
    var sidebarAdmin = document.getElementById('sidebarAdminLink');
    if (typeof hasAdminAccess === 'function' ? hasAdminAccess(currentProfile) : (currentProfile.is_admin || currentProfile.is_moderator || currentProfile.is_item_admin)) {
        if (adminLink) adminLink.href = '/admin/';
        if (adminWrap) adminWrap.style.display = '';
        if (sidebarAdmin) { sidebarAdmin.href = '/admin/'; sidebarAdmin.style.display = ''; }
    }

    var footerNote = document.getElementById('footerNote');
    if (footerNote) {
        footerNote.innerHTML = '&copy;2026 CORVIXZ. Not affiliated with Roblox Corporation.';
    }
    if (typeof refreshNotificationBadges === 'function') refreshNotificationBadges();
}

window.refreshNotificationBadges = async function() {
    if (!currentProfile || typeof getUnreadInboxCount !== 'function') return;
    try {
        var msgCount = await getUnreadInboxCount(currentProfile.id);
        var friendCount = await getPendingFriendRequestCount(currentProfile.id);
        var msgBadge = document.getElementById('sidebarMsgBadge');
        var friendBadge = document.getElementById('sidebarFriendsBadge');
        if (msgBadge) {
            if (msgCount > 0) { msgBadge.textContent = formatNotifCount(msgCount); msgBadge.hidden = false; }
            else { msgBadge.hidden = true; }
        }
        if (friendBadge) {
            if (friendCount > 0) { friendBadge.textContent = formatNotifCount(friendCount); friendBadge.hidden = false; }
            else { friendBadge.hidden = true; }
        }
    } catch (e) {}
};

function setActiveNavLink() {
    var path = window.location.pathname.split('/').filter(Boolean)[0] || 'home';
    var map = { 'games': 'Games', 'catalog': 'Catalog', 'develop': 'Develop', 'forum': 'Forum' };
    var linkText = map[path];
    if (linkText) {
        var links = document.querySelectorAll('.nav-links a');
        for (var i = 0; i < links.length; i++) {
            if (links[i].textContent.trim() === linkText) {
                links[i].classList.add('active');
                break;
            }
        }
    }
}

function loadComponent(id, url, fallback) {
    var el = document.getElementById(id);
    if (!el) return;
    fetch(url)
        .then(function(r) { if (!r.ok) throw new Error(); return r.text(); })
        .then(function(html) {
            el.innerHTML = html;
            updateDynamicElements();
            setActiveNavLink();
        })
        .catch(function() {
            el.innerHTML = fallback;
            updateDynamicElements();
            setActiveNavLink();
        });
}

loadComponent('navbar-placeholder', '/navbar.html', INLINE_NAVBAR);
loadComponent('footer-placeholder', '/footer.html', INLINE_FOOTER);

function loadSiteAlert() {
    var STORAGE_KEY = 'crvx_alert1';
    var DEFAULT_BG = '#F68802';
    var DEFAULT_TEXT = '#ffffff';

    function escAlert(s) {
        var d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    function ensureAlertSlot() {
        var slot = document.getElementById('siteAlertSlot');
        if (slot) return slot;
        slot = document.createElement('div');
        slot.id = 'siteAlertSlot';
        var ph = document.getElementById('navbar-placeholder');
        if (ph && ph.parentNode) ph.parentNode.insertBefore(slot, ph.nextSibling);
        return slot;
    }

    function renderSiteAlert(alert) {
        var slot = ensureAlertSlot();
        if (!slot) return;
        if (!alert || !alert.IsVisible || !alert.Text) {
            slot.className = 'site-alert-fake';
            slot.innerHTML = '';
            return;
        }
        slot.className = 'site-alert-corvixz';
        slot.style.background = alert.BgColor || DEFAULT_BG;
        var textColor = alert.TextColor || DEFAULT_TEXT;
        var content = alert.LinkUrl
            ? '<a class="site-alert-link" href="' + escAlert(alert.LinkUrl) + '" style="color:' + textColor + '">' + escAlert(alert.Text) + '</a>'
            : escAlert(alert.Text);
        slot.innerHTML = '<p class="site-alert-text" style="color:' + textColor + '">' + content + '</p>';
    }

    function mapAlertRow(a) {
        return {
            IsVisible: !!(a && a.is_active && a.text),
            Text: (a && a.text) ? a.text : '',
            LinkUrl: (a && a.link_url) ? a.link_url : '',
            BgColor: (a && a.bg_color) ? a.bg_color : DEFAULT_BG,
            TextColor: (a && a.text_color) ? a.text_color : DEFAULT_TEXT,
            CreatedAt: Date.now()
        };
    }

    try {
        var cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
            var parsed = JSON.parse(cached);
            if (parsed.CreatedAt && (parsed.CreatedAt + 30000) > Date.now()) {
                renderSiteAlert(parsed);
                return;
            }
        }
    } catch (e) {}

    fetch(API_URL + '/site_alerts?select=text,bg_color,text_color,is_active,link_url&id=eq.1', {
        headers: { 'apikey': SUPABASE_ANON_KEY }
    })
    .then(function(r) { if (!r.ok) throw new Error('alert fetch failed'); return r.json(); })
    .then(function(data) {
        var alert = mapAlertRow(data && data[0]);
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(alert)); } catch (e) {}
        renderSiteAlert(alert);
    })
    .catch(function(e) {
        if (console) console.error('Alert error:', e);
        renderSiteAlert(null);
    });
}

window.clearSiteAlertCache = function() {
    try { sessionStorage.removeItem('crvx_alert1'); } catch (e) {}
};

setTimeout(loadSiteAlert, 600);
setTimeout(function() { if (typeof loadPageAds === 'function') loadPageAds(); else if (typeof loadRandomAd === 'function') loadRandomAd(); }, 800);

window.updateSidebarProfile = function() {
    if (!currentProfile) return;
    var un = document.getElementById('sidebarUsername');
    var sp = document.getElementById('sidebarProfile');
    if (un) un.textContent = currentProfile.display_name || currentProfile.username || 'User';
    if (sp && currentProfile.user_number) sp.href = '/profile/' + currentProfile.user_number;
}
var sideCheck = setInterval(function() { if (currentProfile && document.getElementById('sidebarUsername')) { clearInterval(sideCheck); updateSidebarProfile(); } }, 100);

document.addEventListener('click', function(e) {
    if (!e.target.closest('.settings-dropdown')) {
        var dd = document.getElementById('settingsDropdown');
        if (dd) dd.classList.remove('show');
    }
});

var navWatch = setInterval(function() {
    if (currentProfile) { clearInterval(navWatch); updateDynamicElements(); }
}, 50);

var notifPoll = setInterval(function() {
    if (currentProfile && typeof refreshNotificationBadges === 'function') refreshNotificationBadges();
}, 15000);

(function() {
    var s = document.createElement('script');
    s.src = 'js/ui/chat.js';
    s.defer = true;
    document.body.appendChild(s);
})();
