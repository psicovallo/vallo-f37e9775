import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/lib/supabase';
import { LogOut, Bell, BellOff, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

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
  const { isSupported, isSubscribed, requestPermission } = usePushNotifications();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const autoRequested = useRef(false);

  useEffect(() => {
    supabase
      .from('reminders')
      .select('id, text, times, active')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setReminders(data || []));
  }, []);

  // Auto-request push permission after 2s on first visit
  useEffect(() => {
    if (!isSupported || isSubscribed || autoRequested.current) return;
    const firstVisitKey = 'levante_first_visit_push';
    if (localStorage.getItem(firstVisitKey)) return;
    autoRequested.current = true;
    const timer = setTimeout(async () => {
      localStorage.setItem(firstVisitKey, 'true');
      const ok = await requestPermission();
      if (ok) toast.success('Notifiche push attivate!');
    }, 2000);
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, requestPermission]);

  const handlePushToggle = async () => {
    if (isSubscribed) {
      toast.info('Notifiche già attive');
      return;
    }
    const success = await requestPermission();
    if (success) toast.success('Notifiche push attivate!');
    else toast.error('Impossibile attivare le notifiche push');
  };

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || '';

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

      {/* Push notification banner */}
      {isSupported && !isSubscribed && (
        <button
          onClick={handlePushToggle}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/20"
        >
          <BellOff size={20} className="text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Attiva le notifiche</p>
            <p className="text-xs text-muted-foreground">Ricevi promemoria e messaggi in tempo reale</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      )}

      {isSupported && isSubscribed && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
          <Bell size={16} className="text-primary" />
          <span className="text-sm text-primary font-medium">Notifiche push attive</span>
        </div>
      )}

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
