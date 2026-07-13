
(function(global) {
    function escComment(s) {
        var d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function timeAgo(dateStr) {
        var d = new Date(dateStr);
        var sec = Math.floor((Date.now() - d.getTime()) / 1000);
        if (sec < 60) return 'just now';
        if (sec < 3600) return Math.floor(sec / 60) + ' minutes ago';
        if (sec < 86400) return Math.floor(sec / 3600) + ' hours ago';
        if (sec < 604800) return Math.floor(sec / 86400) + ' days ago';
        return d.toLocaleDateString();
    }

    function commentEntryHtml(c) {
        var u = c.author || {};
        var profileId = u.user_number || u.id || '';
        var head = u.avatar_url || u.headshot_url || 'images/avatar/headshot.png';
        return '<div class="row mt-3 comment-entry-row">' +
            '<div class="col-3 pe-4"><a href="profile.html?id=' + escComment(profileId) + '">' +
            '<img class="comment-author-headshot" src="' + escComment(head) + '" alt=""/></a></div>' +
            '<div class="col-9"><div class="comment-entry-box">' +
            '<div class="comment-entry-inner">' +
            '<p class="comment-entry-meta mb-0">Posted ' + escComment(timeAgo(c.created_at)) + ' by ' +
            '<a href="profile.html?id=' + escComment(profileId) + '">' + escComment(u.username || 'User') + '</a></p>' +
            '<p class="mb-0 comment-entry-text">' + escComment(c.body) + '</p>' +
            '</div></div></div></div>';
    }

    function createCommentFormHtml(assetType, assetId) {
        if (!global.currentProfile) return '';
        var head = global.currentProfile.avatar_url || global.currentProfile.headshot_url || 'images/avatar/headshot.png';
        var pid = global.currentProfile.user_number || global.currentProfile.id || '';
        return '<div class="row mt-4 mb-4 comment-create-row" id="commentCreateRow">' +
            '<div class="col-3 pe-4"><a href="profile.html?id=' + escComment(pid) + '">' +
            '<img class="comment-author-headshot" src="' + escComment(head) + '" alt=""/></a></div>' +
            '<div class="col-9">' +
            '<p id="commentPostError" class="text-danger mb-1" style="display:none;"></p>' +
            '<textarea id="commentInputArea" class="comment-textarea" maxlength="200" rows="8" placeholder="Write a comment..."></textarea>' +
            '<div class="comment-continue-wrap">' +
            '<button type="button" class="continueButton-0-2-26 comment-continue-btn" onclick="CommentsUI.submitComment(\'' + assetType + '\',\'' + assetId + '\')">Continue</button>' +
            '</div></div>' +
            '<div class="col-12"><div class="divider-top-thick divider-light mt-3"></div></div></div>';
    }

    global.CommentsUI = {
        state: { assetType: null, assetId: null, offset: 0, limit: 10, hasMore: false, loading: false },

        mount: async function(containerId, assetType, assetId, commentsEnabled) {
            var el = document.getElementById(containerId);
            if (!el) return;
            this.state = { assetType: assetType, assetId: String(assetId), offset: 0, limit: 10, hasMore: false, loading: false };

            if (commentsEnabled === false) {
                el.innerHTML = '<p class="mt-4 fw-600">Comments are disabled for this item.</p>';
                return;
            }

            el.innerHTML = '<div class="row"><div class="col-12 col-lg-9" id="commentPanelInner">' +
                createCommentFormHtml(assetType, String(assetId)) +
                '<div id="commentListArea"><p class="text-muted">Loading comments...</p></div>' +
                '<p id="commentLoadMore" class="comment-load-more" style="display:none;" onclick="CommentsUI.loadMore()">More</p>' +
                '</div></div>';
            await this.loadList(true);
        },

        loadList: async function(reset) {
            var area = document.getElementById('commentListArea');
            if (!area || this.state.loading) return;
            this.state.loading = true;
            try {
                var rows = await getAssetComments(this.state.assetType, this.state.assetId, this.state.limit, this.state.offset);
                this.state.hasMore = (rows || []).length >= this.state.limit;
                var more = document.getElementById('commentLoadMore');
                if (more) more.style.display = this.state.hasMore ? '' : 'none';

                if (reset) {
                    if (!rows || !rows.length) {
                        area.innerHTML = '<p class="mt-2">No comments.</p>';
                    } else {
                        area.innerHTML = rows.map(commentEntryHtml).join('');
                    }
                } else if (rows && rows.length) {
                    area.insertAdjacentHTML('beforeend', rows.map(commentEntryHtml).join(''));
                }
            } catch(e) {
                if (reset) area.innerHTML = '<p class="text-danger">Comments unavailable. Run supabase-groups-comments.sql</p>';
            }
            this.state.loading = false;
        },

        loadMore: async function() {
            this.state.offset += this.state.limit;
            await this.loadList(false);
        },

        submitComment: async function(assetType, assetId) {
            var ta = document.getElementById('commentInputArea');
            var err = document.getElementById('commentPostError');
            var text = ta && ta.value.trim();
            if (!text) {
                if (err) { err.textContent = 'Your comment is too short!'; err.style.display = ''; }
                return;
            }
            if (text.length > 200) {
                if (err) { err.textContent = 'Your comment is too long! It must be under 200 characters.'; err.style.display = ''; }
                return;
            }
            if (err) err.style.display = 'none';
            try {
                await postAssetComment(assetType, assetId, text);
                if (ta) ta.value = '';
                this.state.offset = 0;
                await this.loadList(true);
            } catch(e) {
                if (err) { err.textContent = e.message || 'Failed to post comment.'; err.style.display = ''; }
            }
        }
    };
})(window);
