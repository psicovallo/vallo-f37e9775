import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import GoogleTranslate from '@/components/GoogleTranslate';
import { LANG_MAP } from '@/components/GoogleTranslate';

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

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('lingua_madre').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        const saved = (data as any)?.lingua_madre;
        if (saved && saved !== 'italiano') {
          setLinguaMadre(saved);
        } else if (!saved || saved === 'italiano') {
          // Auto-detect from browser on first use
          const detected = detectBrowserLanguage();
          setLinguaMadre(detected);
          if (detected !== 'italiano' && (!saved || saved === 'italiano')) {
            // Save detected language
            supabase.from('profiles').update({ lingua_madre: detected } as any).eq('user_id', user.id).then(() => {});
          }
        }
      });
  }, [user]);

  const setLanguage = useCallback(async (lang: string) => {
    setLinguaMadre(lang);
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
        <GoogleTranslate language={linguaMadre} />
        <Outlet />
        <BottomNav />
      </div>
    </LangContext.Provider>
  );
}
