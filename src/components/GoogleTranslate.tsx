import { useEffect } from 'react';

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

const LANG_MAP: Record<string, string> = {
  italiano: 'it',
  english: 'en',
  español: 'es',
  français: 'fr',
  deutsch: 'de',
  português: 'pt',
  'العربية': 'ar',
  '中文': 'zh-CN',
  '日本語': 'ja',
  'русский': 'ru',
  'हिन्दी': 'hi',
};

export default function GoogleTranslate({ language }: { language: string }) {
  useEffect(() => {
    const langCode = LANG_MAP[language] || 'it';
    
    // If Italian, remove any existing translation
    if (langCode === 'it') {
      // Reset to original
      const frame = document.querySelector('.goog-te-banner-frame') as HTMLIFrameElement;
      if (frame) {
        const closeBtn = frame.contentDocument?.querySelector('.goog-close-link') as HTMLElement;
        closeBtn?.click();
      }
      // Remove cookie
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
      return;
    }

    // Set the translation cookie
    document.cookie = `googtrans=/it/${langCode}; path=/;`;
    document.cookie = `googtrans=/it/${langCode}; path=/; domain=.${window.location.hostname}`;

    // Init function
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement({
          pageLanguage: 'it',
          includedLanguages: Object.values(LANG_MAP).join(','),
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout?.SIMPLE,
        }, 'google_translate_element');
      }
    };

    // Load script if not already loaded
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else {
      // Re-init
      window.googleTranslateElementInit();
    }

    // Prevent Google Translate from hijacking internal links
    const fixLinks = () => {
      document.querySelectorAll('a[href*="translate.google"]').forEach((a) => {
        const el = a as HTMLAnchorElement;
        try {
          const url = new URL(el.href);
          const u = url.searchParams.get('u');
          if (u) {
            const parsed = new URL(u);
            // If it's an internal link, restore the path
            if (parsed.origin === window.location.origin || parsed.hostname === window.location.hostname) {
              el.href = parsed.pathname + parsed.search + parsed.hash;
            }
          }
        } catch {}
      });
    };

    const observer = new MutationObserver(fixLinks);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });

    return () => observer.disconnect();
  }, [language]);

  return <div id="google_translate_element" style={{ position: 'fixed', top: -9999, left: -9999 }} />;
}

export { LANG_MAP };
