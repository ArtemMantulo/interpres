const SUPPORTED_LANGS = new Set(['en', 'ru', 'ko', 'zh', 'de', 'fr', 'es', 'ar', 'ja']);
const STORAGE_KEY = 'lang';

const safeStorageGet = () => {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
};

const safeStorageSet = (value) => {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {}
};

const normalizeLanguage = (value) => {
    const lang = String(value || '')
        .trim()
        .toLowerCase()
        .split('-')[0];
    return SUPPORTED_LANGS.has(lang) ? lang : 'en';
};

const detectLanguage = () =>
    normalizeLanguage(
        new URLSearchParams(location.search).get(STORAGE_KEY) ||
            document.documentElement.getAttribute('lang') ||
            safeStorageGet() ||
            navigator.language ||
            'en'
    );

const getLanguage = (forcedLanguage) =>
    forcedLanguage ? normalizeLanguage(forcedLanguage) : detectLanguage();

const applyTranslations = (dictionary) => {
    const elements = document.querySelectorAll('[data-lng]');
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const key = el.getAttribute('data-lng');
        if (!key || !Object.prototype.hasOwnProperty.call(dictionary, key)) continue;

        const text = dictionary[key];
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') el.placeholder = text;
        else el.textContent = text;
    }
};

export async function loadLanguage(forcedLanguage) {
    const language = getLanguage(forcedLanguage);

    document.documentElement.setAttribute('lang', language);
    safeStorageSet(language);

    try {
        const response = await fetch(`assets/language/${language}.json`);
        if (response.ok) applyTranslations(await response.json());
    } catch (err) {
        console.error('Translation load error:', err);
    }

    return language;
}

if (typeof window !== 'undefined') {
    const api = window.AppLanguage || {};
    api.get = getLanguage;
    api.normalize = normalizeLanguage;
    window.AppLanguage = api;
}
