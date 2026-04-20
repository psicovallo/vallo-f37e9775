import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { toast } from 'sonner';

async function handleSocial(provider: 'google' | 'apple') {
  const result = await lovable.auth.signInWithOAuth(provider, {
    redirect_uri: window.location.origin + '/home',
  });
  if (result.error) {
    toast.error((result.error as any)?.message || 'Errore accesso social');
  }
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/home', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Normalizza phone: tieni solo cifre
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    setLoading(true);
    try {
      await signIn(email, password);
      // Login riuscito: se l'utente ha digitato un numero in fase di accesso, salvalo
      if (cleanPhone.length >= 10) {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          await supabase
            .from('profiles')
            .update({ phone_number: cleanPhone, wa_notifications_enabled: true })
            .eq('user_id', u.id);
        }
      }
      navigate('/home', { replace: true });
    } catch {
      try {
        if (cleanPhone.length < 10) {
          toast.error('Inserisci un numero WhatsApp valido (almeno 10 cifre con prefisso)');
          setLoading(false);
          return;
        }
        await signUp(email, password, name || undefined, cleanPhone);
        await signIn(email, password);
        // Riallinea phone_number dopo il signIn (in caso il profilo fosse stato creato dopo)
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          await supabase
            .from('profiles')
            .update({ phone_number: cleanPhone, wa_notifications_enabled: true })
            .eq('user_id', u.id);
        }
        navigate('/home', { replace: true });
      } catch (err: any) {
        toast.error(err.message || 'Errore di autenticazione');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Email inviata! Controlla la tua casella per reimpostare la password.');
      setMode('login');
    } catch (err: any) {
      toast.error(err.message || 'Errore nell\'invio dell\'email');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (mode === 'forgot') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-primary">Proteggi il tuo DNA</h1>
            <p className="mt-2 text-sm text-muted-foreground">Recupera la tua password</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '...' : 'Invia link di recupero'}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            <button onClick={() => setMode('login')} className="text-primary hover:underline">
              Torna al login
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Proteggi il tuo DNA</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Registrati per non perdere i tuoi profili, i tuoi obiettivi e l'archivio segreto del Consiglio dei Maestri. I tuoi dati saranno criptati e accessibili solo a te.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Nome"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="space-y-1">
            <input
              type="tel"
              placeholder="WhatsApp con prefisso (es. 393331234567)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              inputMode="tel"
              pattern="[0-9+\s]{10,16}"
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="px-2 text-[10px] text-muted-foreground">
              Obbligatorio. Riceverai notifiche WhatsApp dal Consiglio. Niente prefisso "+" o spazi: solo cifre con il codice paese (es. 39 per l'Italia).
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '...' : 'Entra'}
          </button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">oppure continua con</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleSocial('google')}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3 font-semibold text-foreground transition-opacity hover:opacity-90"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continua con Google
          </button>
          <button
            type="button"
            onClick={() => handleSocial('apple')}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3 font-semibold text-foreground transition-opacity hover:opacity-90"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 12.04c-.03-2.86 2.34-4.24 2.45-4.31-1.34-1.95-3.42-2.22-4.16-2.25-1.77-.18-3.46 1.04-4.36 1.04-.91 0-2.3-1.02-3.78-.99-1.94.03-3.74 1.13-4.74 2.86-2.02 3.5-.52 8.69 1.45 11.54.96 1.39 2.11 2.96 3.6 2.9 1.45-.06 2-.94 3.75-.94s2.25.94 3.78.91c1.56-.03 2.55-1.42 3.51-2.82 1.1-1.62 1.56-3.18 1.59-3.26-.04-.02-3.05-1.17-3.09-4.65zM14.21 3.7c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.86-1.39 2.23-1.21 3.55 1.29.1 2.6-.65 3.4-1.63z"/>
            </svg>
            Continua con Apple
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          <button onClick={() => setMode('forgot')} className="text-primary hover:underline">
            Password dimenticata?
          </button>
        </p>
      </div>
    </div>
  );
}
