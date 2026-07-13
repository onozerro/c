(function() {
    var chatMenuOpen = false;
    var openWindows = [];
    var pollTimer = null;
    var chatUserMap = {};

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    function ensureChatRoot() {
        if (document.getElementById('corvixzChatRoot')) return;
        var root = document.createElement('div');
        root.id = 'corvixzChatRoot';
        root.innerHTML =
            '<div id="corvixzChatMenu" class="corvixz-chat-menu">' +
                '<div class="corvixz-chat-header" id="corvixzChatHeader">' +
                    '<span class="corvixz-chat-label">Chat <span class="corvixz-chat-unread-bubble" id="corvixzChatUnreadBubble" hidden>0</span></span>' +
                '</div>' +
                '<div class="corvixz-chat-body" id="corvixzChatBody" hidden></div>' +
            '</div>' +
            '<div id="corvixzChatWindows"></div>';
        document.body.appendChild(root);
        document.getElementById('corvixzChatHeader').addEventListener('click', toggleChatMenu);
    }

    function toggleChatMenu() {
        chatMenuOpen = !chatMenuOpen;
        var body = document.getElementById('corvixzChatBody');
        if (body) body.hidden = !chatMenuOpen;
        if (chatMenuOpen) refreshChatMenu();
    }

    function setChatUnreadBubble(count) {
        var el = document.getElementById('corvixzChatUnreadBubble');
        if (!el) return;
        count = Number(count) || 0;
        if (count > 0) {
            el.textContent = formatNotifCount(count);
            el.hidden = false;
        } else {
            el.hidden = true;
        }
    }

    async function refreshChatMenu() {
        if (!currentProfile) return;
        var body = document.getElementById('corvixzChatBody');
        if (!body) return;
        try {
            var convos = await getChatConversations(currentProfile.id);
            var friends = await getFriends(currentProfile.id);
            var convoUserIds = {};
            convos.forEach(function(c) { convoUserIds[c.user.id] = true; });
            var html = '';
            convos.sort(function(a, b) {
                return new Date(b.latest.created_at) - new Date(a.latest.created_at);
            }).forEach(function(c) {
                html += chatEntryHtml(c.user, c.latest.body, c.hasUnread);
            });
            friends.forEach(function(f) {
                if (convoUserIds[f.id]) return;
                html += chatEntryHtml(f, '', false);
            });
            body.innerHTML = html || '<p class="corvixz-chat-empty">No friends to chat with.</p>';
            body.querySelectorAll('.corvixz-chat-entry').forEach(function(el) {
                el.addEventListener('click', function() {
                    var uid = el.getAttribute('data-user-id');
                    if (chatUserMap[uid]) openChatWindow(chatUserMap[uid]);
                });
            });
        } catch (e) {
            body.innerHTML = '<p class="corvixz-chat-empty">Chat unavailable.</p>';
        }
    }

    function chatEntryHtml(user, preview, unread) {
        chatUserMap[user.id] = user;
        var head = user.headshot_url || user.avatar_url || 'images/avatar/headshot.png';
        var name = user.display_name || user.username;
        return '<div class="corvixz-chat-entry" data-user-id="' + esc(user.id) + '">' +
            '<div class="corvixz-chat-entry-head"><img src="' + esc(head) + '" alt=""/></div>' +
            '<div class="corvixz-chat-entry-text">' +
                '<p class="corvixz-chat-entry-name">' + esc(name) + '</p>' +
                '<p class="corvixz-chat-entry-preview' + (unread ? ' unread' : '') + '">' + (preview ? esc(preview) : '&nbsp;') + '</p>' +
            '</div></div>';
    }

    function openChatWindow(user) {
        if (!user || !user.id) return;
        var existing = openWindows.findIndex(function(w) { return w.user.id === user.id; });
        if (existing !== -1) {
            var moved = openWindows.splice(existing, 1)[0];
            openWindows.unshift(moved);
            renderChatWindows();
            return;
        }
        if (openWindows.length >= 3) openWindows.pop();
        openWindows.unshift({ user: user, messages: null });
        renderChatWindows();
        loadChatWindowMessages(user.id);
    }

    function closeChatWindow(userId) {
        openWindows = openWindows.filter(function(w) { return w.user.id !== userId; });
        renderChatWindows();
    }

    function renderChatWindows() {
        var wrap = document.getElementById('corvixzChatWindows');
        if (!wrap) return;
        wrap.innerHTML = '';
        openWindows.forEach(function(win, i) {
            var user = win.user;
            var name = user.display_name || user.username;
            var right = 30 + ((i + 1) * 260);
            var box = document.createElement('div');
            box.className = 'corvixz-chat-window';
            box.style.right = right + 'px';
            box.innerHTML =
                '<div class="corvixz-chat-header">' +
                    '<span class="corvixz-chat-label">' + esc(name) + '</span>' +
                    '<span class="corvixz-chat-close" data-user-id="' + user.id + '">X</span>' +
                '</div>' +
                '<div class="corvixz-chat-window-body">' +
                    '<div class="corvixz-chat-history" id="corvixzChatHist-' + user.id + '"></div>' +
                    '<input type="text" class="corvixz-chat-input" id="corvixzChatInput-' + user.id + '" placeholder="Send a message" maxlength="255"/>' +
                '</div>';
            wrap.appendChild(box);
            box.querySelector('.corvixz-chat-close').addEventListener('click', function(e) {
                e.stopPropagation();
                closeChatWindow(user.id);
            });
            var input = box.querySelector('.corvixz-chat-input');
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') sendChatFromInput(user, input);
            });
            if (win.messages) renderChatHistory(user.id, win.messages);
        });
    }

    function renderChatHistory(userId, messages) {
        var hist = document.getElementById('corvixzChatHist-' + userId);
        if (!hist || !currentProfile) return;
        var html = '';
        (messages || []).forEach(function(m) {
            var isMe = m.sender_id === currentProfile.id;
            html += '<div class="corvixz-chat-msg-row ' + (isMe ? 'self' : 'other') + '">' +
                '<div class="corvixz-chat-msg-bubble">' + esc(m.body) + '</div></div>';
        });
        hist.innerHTML = html;
        hist.scrollTop = hist.scrollHeight;
    }

    async function loadChatWindowMessages(otherId) {
        if (!currentProfile) return;
        try {
            var msgs = await getChatThread(currentProfile.id, otherId);
            var win = openWindows.find(function(w) { return w.user.id === otherId; });
            if (win) {
                win.messages = msgs || [];
                renderChatHistory(otherId, win.messages);
            }
            await markChatThreadRead(currentProfile.id, otherId);
            if (typeof window.refreshNotificationBadges === 'function') window.refreshNotificationBadges();
        } catch (e) {}
    }

    async function sendChatFromInput(user, input) {
        if (!currentProfile || !input || input.disabled) return;
        var text = (input.value || '').trim();
        if (!text) return;
        input.disabled = true;
        try {
            await sendChatMessage(user.id, text);
            input.value = '';
            await loadChatWindowMessages(user.id);
            refreshChatMenu();
        } catch (e) {
            console.error('Chat send error:', e);
        }
        input.disabled = false;
        input.focus();
    }

    async function pollChat() {
        if (!currentProfile) return;
        try {
            var unread = await getUnreadChatCount(currentProfile.id);
            setChatUnreadBubble(unread);
            if (chatMenuOpen) refreshChatMenu();
            openWindows.forEach(function(w) {
                loadChatWindowMessages(w.user.id);
            });
        } catch (e) {}
    }

    window.initCorvixzChat = function() {
        if (!currentProfile || document.body.classList.contains('no-chat')) return;
        ensureChatRoot();
        pollChat();
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(pollChat, 5000);
    };

    var chatInitCheck = setInterval(function() {
        if (currentProfile && typeof getFriends === 'function') {
            clearInterval(chatInitCheck);
            initCorvixzChat();
        }
    }, 200);
})();
