(function (global) {
    'use strict';
    function esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    function escAttr(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/`/g, '&#x60;')
            .replace(/ /g, '&#x20;')
            .replace(/=/g, '&#x3D;');
    }
    function safeUrl(s) {
        if (s == null) return '#';
        var u = String(s).trim();
        if (u === '' || u === '#') return '#';
        var decoded = u
            .replace(/&[a-z0-9#]+;/gi, '')
            .replace(/%[0-9a-f]{2}/gi, '')
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        if (/javascript:|data:|vbs:/i.test(decoded) || /javascript:|data:|vbs:/i.test(u)) {
            return '#';
        }
        if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(u)) return u;
        if (/^\.{0,2}\//.test(u)) return u;
        return '#';
    }
    var cssColorNames = new Set([
        'transparent', 'inherit', 'currentcolor', 'black', 'silver', 'gray', 'white', 
        'maroon', 'red', 'purple', 'fuchsia', 'green', 'lime', 'olive', 'yellow', 'navy', 
        'blue', 'teal', 'aqua', 'orange', 'aliceblue', 'antiquewhite', 'aquamarine', 'azure'
    ]);
    function escColor(s) {
        if (s == null) return '';
        var u = String(s).trim().toLowerCase();
        if (/^#[0-9a-f]{3,8}$/.test(u)) return u;
        if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(u)) return u;
        if (cssColorNames.has(u)) return u;
        return '';
    }
    function escJs(s) {
        if (s == null) return "''";
        return JSON.stringify(String(s))
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
    }
    function escOption(s) {
        return esc(s);
    }
    var domPurifyLoaded = false;
    function ensureDOMPurify(cb) {
        if (typeof DOMPurify !== 'undefined') { domPurifyLoaded = true; if (cb) cb(); return; }
        if (domPurifyLoaded) { if (cb) cb(); return; }
        var s = document.createElement('script');
        s.src = 'https://cloudflare.com';
        s.onload = function () { domPurifyLoaded = true; if (cb) cb(); };
        s.onerror = function () { console.warn('DOMPurify failed to load'); };
        document.head.appendChild(s);
    }
    function purifyHtml(html, cb) {
        if (typeof DOMPurify !== 'undefined') {
            var r = DOMPurify.sanitize(html);
            if (cb) cb(r);
            return r;
        }
        ensureDOMPurify(function () {
            if (typeof DOMPurify !== 'undefined') {
                var r = DOMPurify.sanitize(html);
                if (cb) cb(r);
            } else if (cb) {
                cb(esc(html));
            }
        });
        return '<!-- Loading library... -->';
    }
    function safeJsonParse(str, fallback) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return fallback !== undefined ? fallback : null;
        }
    }
    function validateBase64(str) {
        if (typeof str !== 'string' || str.trim() === '') return false;
        try {
            return btoa(atob(str)) === str.trim();
        } catch (e) {
            return false;
        }
    }
    global.CRVZSec = {
        esc: esc,
        escAttr: escAttr,
        escJs: escJs,
        safeUrl: safeUrl,
        escColor: escColor,
        escOption: escOption,
        purifyHtml: purifyHtml,
        ensureDOMPurify: ensureDOMPurify,
        safeJsonParse: safeJsonParse,
        validateBase64: validateBase64
    };
})(window);
