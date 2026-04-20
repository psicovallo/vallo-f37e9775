import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import PhoneVerifyForm from './PhoneVerifyForm';

const SNOOZE_KEY = 'vallo_phone_gate_snooze_until';
const SNOOZE_HOURS = 24;

/**
 * Modale brutalista mostrata agli utenti senza phone_number.
 * - Bloccante full-screen al primo accesso.
 * - Se l'utente la chiude (snooze), si ripresenta dopo 24h.
 */
export default function PhoneRequiredGate() {
  const { user } = useAuth();
  const [needPhone, setNeedPhone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const hasPhone = !!data?.phone_number && data.phone_number.replace(/\D/g, '').length >= 10;
      if (hasPhone) {
        setNeedPhone(false);
        return;
      }

      // Controlla snooze
      const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (snoozeUntil > Date.now()) {
        setNeedPhone(false);
        return;
      }

      setNeedPhone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSnooze = () => {
    const until = Date.now() + SNOOZE_HOURS * 60 * 60 * 1000;
    localStorage.setItem(SNOOZE_KEY, String(until));
    setNeedPhone(false);
    toast.warning('Te lo ricorderò di nuovo tra 24 ore.', { duration: 4000 });
  };

  if (!needPhone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-primary bg-card p-6 space-y-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/20 p-2.5">
            <AlertTriangle size={26} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground leading-tight">
              Manca il tuo canale diretto
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Psico Vallo ha bisogno del tuo numero WhatsApp per raggiungerti quando le notifiche del browser falliscono.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl bg-background/60 border border-border p-3 text-xs text-muted-foreground leading-relaxed">
          <p>📡 <span className="text-foreground font-semibold">Senza numero perdi:</span> Mandato di Comparizione, alert SOS DNA, richiami del Tribunale.</p>
          <p>🔒 Il numero resta tuo. Niente spam, niente terze parti.</p>
        </div>

        <PhoneVerifyForm
          userId={user!.id}
          submitLabel="Verifica e attiva WhatsApp"
          onVerified={() => {
            localStorage.removeItem(SNOOZE_KEY);
            setNeedPhone(false);
          }}
        />

        <button
          onClick={handleSnooze}
          className="w-full rounded-2xl border border-border bg-transparent py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Più tardi (te lo ricordo tra 24h)
        </button>
      </div>
    </div>
  );
}
