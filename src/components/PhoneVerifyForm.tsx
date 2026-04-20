import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Phone, ShieldCheck } from 'lucide-react';

interface Props {
  /** Se passato, in caso di verifica positiva l'edge function aggiorna phone_number sul profilo. */
  userId?: string;
  /** Etichette/colori opzionali */
  submitLabel?: string;
  /** Callback eseguita su verifica avvenuta. Riceve il numero pulito (solo cifre). */
  onVerified: (cleanPhone: string) => void | Promise<void>;
  initialPhone?: string;
}

/**
 * Form a 2 step:
 *  step 'phone' -> chiede numero, invia OTP via WhatsApp
 *  step 'code'  -> chiede codice 6 cifre, verifica, chiama onVerified
 */
export default function PhoneVerifyForm({ userId, submitLabel = 'Verifica e salva', onVerified, initialPhone = '' }: Props) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const cleanPhone = phone.replace(/\D/g, '');

  const sendCode = async () => {
    if (cleanPhone.length < 10) {
      toast.error('Numero non valido. Inserisci almeno 10 cifre con prefisso (es. 393331234567).');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-phone-otp', {
        body: { phoneNumber: cleanPhone, userId },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).message || (data as any).error);
        return;
      }
      toast.success('Codice inviato su WhatsApp. Controlla la chat.');
      setStep('code');
    } catch (err: any) {
      toast.error(err?.message || 'Invio codice fallito');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const c = code.replace(/\D/g, '');
    if (c.length !== 6) {
      toast.error('Inserisci il codice a 6 cifre.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-otp', {
        body: { phoneNumber: cleanPhone, code: c, userId },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).message || (data as any).error);
        return;
      }
      toast.success('Numero verificato.');
      await onVerified(cleanPhone);
    } catch (err: any) {
      toast.error(err?.message || 'Verifica fallita');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'phone') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3">
          <Phone size={16} className="text-muted-foreground" />
          <input
            type="tel"
            inputMode="tel"
            placeholder="393331234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 bg-transparent py-3 text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="px-1 text-[10px] text-muted-foreground">
          Solo cifre, con codice paese. Italia: <span className="font-mono text-foreground">39</span> + numero. Ti invieremo un codice di verifica via WhatsApp.
        </p>
        <button
          type="button"
          onClick={sendCode}
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
          {busy ? 'Invio...' : 'Invia codice WhatsApp'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Hai ricevuto un codice a 6 cifre su WhatsApp al numero{' '}
        <span className="font-mono text-foreground">{cleanPhone}</span>. Inseriscilo qui sotto.
      </p>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="● ● ● ● ● ●"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.6em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="button"
        onClick={verifyCode}
        disabled={busy}
        className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
        {busy ? 'Verifica...' : submitLabel}
      </button>
      <button
        type="button"
        onClick={() => { setStep('phone'); setCode(''); }}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Cambia numero o reinvia
      </button>
    </div>
  );
}