(function(global) {
    var STORAGE_KEY = 'crvx_theme';
    var VALID = { default: true, obc: true, legacy: true };

    var VARS = {
        default: {
            '--primary-color': '#0074BD',
            '--primary-color-2': '#0074BD',
            '--primary-color-hover': '#005a94',
            '--secondary-color': '#005a94',
            '--blue-color': '#00a2ff',
            '--blue-color-2': '#00a2ff',
            '--blue-color-hover': '#32b5ff',
            '--blue--secondary-color': '#0074bd',
            '--accent-tab': '#00a2ff',
            '--background-color': '#e3e3e3',
            '--link-color': '#0055b3'
        },
        obc: {
            '--primary-color': '#393939',
            '--primary-color-2': '#393939',
            '--primary-color-hover': '#4a4a4a',
            '--secondary-color': '#2a2a2a',
            '--blue-color': '#00a2ff',
            '--blue-color-2': '#00a2ff',
            '--blue-color-hover': '#32b5ff',
            '--blue--secondary-color': '#393939',
            '--accent-tab': '#393939',
            '--background-color': '#222224',
            '--link-color': '#7ec8ff',
            '--text-color-primary': '#ffffff',
            '--text-color-tertiary': '#cccccc'
        },
        legacy: {
            '--primary-color': '#004696',
            '--primary-color-2': '#004696',
            '--primary-color-hover': '#003570',
            '--secondary-color': '#003570',
            '--blue-color': '#004696',
            '--blue-color-2': '#004696',
            '--blue-color-hover': '#003570',
            '--blue--secondary-color': '#004696',
            '--accent-tab': '#004696',
            '--background-color': '#DDD9DB',
            '--link-color': '#004696'
        }
    };

    function normalizeTheme(value) {
        if (!value || !VALID[value]) return 'default';
        return value;
    }

    function getTheme() {
        try { return normalizeTheme(localStorage.getItem(STORAGE_KEY)); }
        catch (e) { return 'default'; }
    }

    function applyTheme(theme) {
        theme = normalizeTheme(theme);
        var root = document.documentElement;
        var vars = VARS[theme] || VARS.default;
        root.setAttribute('data-theme', theme);
        Object.keys(vars).forEach(function(key) {
            root.style.setProperty(key, vars[key]);
        });
        if (document.body) {
            document.body.classList.remove('theme-default', 'theme-obc', 'theme-legacy');
            document.body.classList.add('theme-' + theme);
        }
    }

    function setTheme(theme) {
        theme = normalizeTheme(theme);
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
        applyTheme(theme);
    }

    applyTheme(getTheme());
    document.addEventListener('DOMContentLoaded', function() { applyTheme(getTheme()); });

    global.getSiteTheme = getTheme;
    global.setSiteTheme = setTheme;
    global.applySiteTheme = applyTheme;
    global.SITE_THEMES = [
        { id: 'default', label: 'Default' },
        { id: 'obc', label: 'OBC Theme' },
        { id: 'legacy', label: 'Legacy' }
    ];
})(window);
