import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import OnboardingPage from '@/pages/OnboardingPage';
import HamburgerMenu from '@/components/HamburgerMenu';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 13) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

interface ActiveQuestion {
  question_text: string;
  view_count: number;
  sort_order: number;
}

export default function HomePage() {
  const { user, signOut } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      const { data } = await supabase
        .from('question_progress')
        .select('id, onboarding_completed')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setOnboardingDone(data?.onboarding_completed ?? false);
    };

    checkOnboarding();
  }, [user]);

  useEffect(() => {
    if (!onboardingDone || !user) return;

    const loadActive = async () => {
      const { data } = await supabase
        .from('question_assignments')
        .select('question_text, view_count, sort_order')
        .eq('user_id', user.id)
        .neq('status', 'risolta')
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      setActiveQuestion(data as ActiveQuestion | null);
    };

    loadActive();
  }, [onboardingDone, user]);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || '';

  if (onboardingDone === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!onboardingDone) {
    return <OnboardingPage onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-foreground">{userName}</h1>
        </div>
        <HamburgerMenu />
      </div>

      {/* Active question card */}
      <Link
        to="/question"
        className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/20"
      >
        <span className="text-2xl">🔥</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Domanda attiva</p>
          {activeQuestion ? (
            <>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{activeQuestion.question_text}</p>
              <div className="mt-2 flex items-center gap-2">
                <Eye size={12} className="text-primary" />
                <span className="text-xs text-primary font-medium">{activeQuestion.view_count}/9 osservazioni</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Tutte le domande completate!</p>
          )}
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </Link>

      {/* Quick links */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          to="/sfogo"
          className="flex flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary active:scale-[0.97]"
        >
          <span className="text-2xl">✍️</span>
          <span className="text-xs font-medium text-foreground text-center">Area Sfogo</span>
          <span className="text-[10px] text-muted-foreground text-center">Scrivi e rifletti</span>
        </Link>
        <Link
          to="/sos-conflitti"
          className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:border-destructive active:scale-[0.97]"
        >
          <span className="text-2xl">⚔️</span>
          <span className="text-xs font-medium text-foreground text-center">SOS DNA</span>
          <span className="text-[10px] text-muted-foreground text-center">Il Consiglio dei 15</span>
        </Link>
        <Link
          to="/contract"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary active:scale-[0.97]"
        >
          <span className="text-2xl">📜</span>
          <span className="text-xs font-medium text-foreground text-center">Il Patto</span>
        </Link>
        <Link
          to="/notes"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary active:scale-[0.97]"
        >
          <span className="text-2xl">📝</span>
          <span className="text-xs font-medium text-foreground text-center">Note</span>
        </Link>
        <Link
          to="/messages"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary active:scale-[0.97]"
        >
          <span className="text-2xl">💬</span>
          <span className="text-xs font-medium text-foreground text-center">Messaggi</span>
        </Link>
      </div>
    </div>
  );
}
