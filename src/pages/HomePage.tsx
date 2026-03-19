import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import OnboardingPage from '@/pages/OnboardingPage';

interface Reminder {
  id: string;
  text: string;
  times: string[] | null;
  active: boolean;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 13) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export default function HomePage() {
  const { user, signOut } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      const { data, error } = await supabase
        .from('question_progress')
        .select('id, onboarding_completed')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setOnboardingDone(false);
        return;
      }

      setOnboardingDone(data?.onboarding_completed ?? false);
    };

    checkOnboarding();
  }, [user]);

  useEffect(() => {
    if (!onboardingDone) return;
    supabase
      .from('reminders')
      .select('id, text, times, active')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setReminders(data || []));
  }, [onboardingDone]);

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
        <button onClick={signOut} className="rounded-2xl p-2 text-muted-foreground transition-colors hover:text-foreground">
          <LogOut size={20} />
        </button>
      </div>

      <Link
        to="/question"
        className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/20"
      >
        <span className="text-2xl">🔥</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Domanda attiva</p>
          <p className="text-xs text-muted-foreground">Apri la domanda che il sistema continuerà a riproporti finché non la completi</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </Link>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Link
          to="/contract"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <span className="text-2xl">📜</span>
          <span className="text-xs font-medium text-foreground text-center">Contratto</span>
        </Link>
        <Link
          to="/reminders"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <span className="text-2xl">🔔</span>
          <span className="text-xs font-medium text-foreground text-center">Promemoria</span>
        </Link>
        <Link
          to="/notes"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <span className="text-2xl">📝</span>
          <span className="text-xs font-medium text-foreground text-center">Note</span>
        </Link>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Promemoria attivi</h2>
          <Link to="/reminders" className="text-xs text-primary hover:underline">Vedi tutti</Link>
        </div>
        {reminders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nessun promemoria attivo</p>
        ) : (
          <div className="space-y-2">
            {reminders.map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <Clock size={16} className="shrink-0 text-primary" />
                <span className="flex-1 text-sm text-foreground">{r.text}</span>
                {r.times && r.times.length > 0 && (
                  <span className="text-xs text-muted-foreground">{r.times.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
