import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { LogOut, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

export default function HomePage() {
  const { user, signOut } = useAuth();
  const { isSupported, isSubscribed, requestPermission } = usePushNotifications();

  const handlePushToggle = async () => {
    if (isSubscribed) {
      toast.info('Notifiche già attive');
      return;
    }
    const success = await requestPermission();
    if (success) {
      toast.success('Notifiche push attivate!');
    } else {
      toast.error('Impossibile attivare le notifiche push');
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Levante</h1>
          <p className="text-xs text-muted-foreground">Alzati. Costruisci. Domina.</p>
        </div>
        <button onClick={signOut} className="rounded-2xl p-2 text-muted-foreground hover:text-foreground">
          <LogOut size={20} />
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Benvenuto,</p>
        <p className="text-lg font-semibold text-foreground">{user?.email}</p>
      </div>

      {isSupported && (
        <button
          onClick={handlePushToggle}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-colors ${
            isSubscribed
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-foreground hover:border-primary'
          }`}
        >
          {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
          {isSubscribed ? 'Notifiche push attive' : 'Attiva notifiche push'}
        </button>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        {[
          { label: 'Promemoria', emoji: '🔔', path: '/reminders' },
          { label: 'Note', emoji: '📝', path: '/notes' },
          { label: 'Messaggi', emoji: '💬', path: '/messages' },
          { label: 'Profilo', emoji: '👤', path: '#' },
        ].map(item => (
          <a
            key={item.label}
            href={item.path}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
