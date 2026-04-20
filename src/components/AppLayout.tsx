import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import GoogleTranslate from '@/components/GoogleTranslate';
import { LANG_MAP } from '@/components/GoogleTranslate';
import PhoneRequiredGate from '@/components/PhoneRequiredGate';

const TRANSLATION_ENABLED_KEY = 'vallo_translation_enabled';

// Map browser lang codes to our language names
function detectBrowserLanguage(): string {
  const browserLang = (navigator.language || '').toLowerCase();
  for (const [name, code] of Object.entries(LANG_MAP)) {
    if (browserLang === code || browserLang.startsWith(code.split('-')[0])) {
      return name;
    }
  }
  return 'italiano';
}

interface LangContextType {
  linguaMadre: string;
  setLanguage: (lang: string) => void;
}

const LangContext = createContext<LangContextType>({ linguaMadre: 'italiano', setLanguage: () => {} });
export const useLanguage = () => useContext(LangContext);

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [linguaMadre, setLinguaMadre] = useState('italiano');
  const [translationEnabled, setTranslationEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('lingua_madre').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        const saved = (data as any)?.lingua_madre;
        const detected = saved || detectBrowserLanguage();
        const enabled = localStorage.getItem(TRANSLATION_ENABLED_KEY) === 'true' && detected !== 'italiano';

        setLinguaMadre(detected);
        setTranslationEnabled(enabled);

        if (!saved && detected !== 'italiano') {
          supabase.from('profiles').update({ lingua_madre: detected } as any).eq('user_id', user.id).then(() => {});
        }
      });
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (!translationEnabled) {
      root.lang = 'it';
      root.setAttribute('translate', 'no');
      root.classList.add('notranslate');
      body.classList.add('notranslate');
      return;
    }

    root.lang = LANG_MAP[linguaMadre] || 'it';
    root.setAttribute('translate', 'yes');
    root.classList.remove('notranslate');
    body.classList.remove('notranslate');
  }, [linguaMadre, translationEnabled]);

  const setLanguage = useCallback(async (lang: string) => {
    setLinguaMadre(lang);
    const enabled = lang !== 'italiano';
    setTranslationEnabled(enabled);
    localStorage.setItem(TRANSLATION_ENABLED_KEY, enabled ? 'true' : 'false');

    if (user) {
      await supabase.from('profiles').update({ lingua_madre: lang } as any).eq('user_id', user.id);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <LangContext.Provider value={{ linguaMadre, setLanguage }}>
      <div className="min-h-screen bg-background pb-20">
        <GoogleTranslate language={linguaMadre} enabled={translationEnabled} />
        <Outlet />
        <BottomNav />
        <PhoneRequiredGate />
      </div>
    </LangContext.Provider>
  );
}
