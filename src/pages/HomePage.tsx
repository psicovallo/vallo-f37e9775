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

  // Check onboarding status
  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      const { data } = await supabase
        .from('question_progress')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

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

  // Loading
  if (onboardingDone === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Show onboarding
  if (!onboardingDone) {
    return <OnboardingPage onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-foreground">{userName}</h1>
        </div>
        <button onClick={signOut} className="rounded-2xl p-2 text-muted-foreground hover:text-foreground transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      {/* Question CTA */}
      <Link
        to="/question"
        className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/20"
      >
        <span className="text-2xl">🔥</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Domanda del giorno</p>
          <p className="text-xs text-muted-foreground">Vai alla tua prossima domanda di sradicamento</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </Link>

      {/* Quick links */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          to="/reminders"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <span className="text-2xl">🔔</span>
          <span className="text-sm font-medium text-foreground">Promemoria</span>
        </Link>
        <Link
          to="/notes"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <span className="text-2xl">📝</span>
          <span className="text-sm font-medium text-foreground">Note</span>
        </Link>
      </div>

      {/* Active reminders */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Promemoria attivi</h2>
          <Link to="/reminders" className="text-xs text-primary hover:underline">Vedi tutti</Link>
        </div>
        {reminders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nessun promemoria attivo</p>
        ) : (
          <div className="space-y-2">
            {reminders.map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <Clock size={16} className="text-primary shrink-0" />
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
