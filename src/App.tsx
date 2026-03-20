
import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
// Utilizzo di un bundle ESM ottimizzato per il browser per garantire stabilità totale
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.1/+esm';

// --- CONFIGURAZIONE SUPABASE ---
// Identificativo progetto: osodrojmtefahxsiwdqz
const supabaseUrl = 'https://osodrojmtefahxsiwdqz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2Ryb2ptdGVmYWh4c2l3ZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTM0MzQsImV4cCI6MjA4OTU4OTQzNH0.hOtE9IPXrvnb9Gh5gUCPFbYdNh4Gao0OBZaWN0ys5mg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- CONTESTO DI AUTENTICAZIONE ---
// Gestione dello stato globale dell'utente e del caricamento iniziale
const AuthContext = createContext<any>({ user: null, loading: true });

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sincronizzazione sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Monitoraggio in tempo reale degli eventi di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

// --- GUARDIA DI SICUREZZA E ONBOARDING ---
// Forza il completamento del flusso obbligatorio prima di sbloccare la Home
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkStep = async () => {
      if (!user) return setLoading(false);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_step')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // Inizializzazione profilo per nuovi utenti
          await supabase.from('profiles').insert([{ id: user.id, onboarding_step: 0 }]);
          setOnboardingStep(0);
        } else {
          setOnboardingStep(data?.onboarding_step ?? 0);
        }
      } catch (err) {
        setOnboardingStep(0);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) checkStep();
  }, [user, authLoading]);

  // UI di transizione Brutalista
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 space-y-4 font-mono">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
        <span className="text-zinc-600 text-[10px] uppercase tracking-[0.4em] animate-pulse italic">
          Verifica Protocollo...
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  
  const isOnboarding = location.pathname.startsWith('/onboarding');
  
  // Reindirizzamento forzato se l'onboarding non è completato (Step 3)
  if (onboardingStep !== null && onboardingStep < 3 && !isOnboarding) {
    const routes = ['/onboarding/patto', '/onboarding/identita', '/onboarding/pietra-miliare'];
    return <Navigate to={routes[onboardingStep] || '/onboarding/patto'} replace />;
  }
  
  return <>{children}</>;
};

// --- PAGINA ACCESSO ---
const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate('/home'); }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Soft Login: Accesso automatico post-registrazione
        if (!data.session) await supabase.auth.signInWithPassword({ email, password });
        toast.success("Accesso eseguito.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[340px] space-y-10 text-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Vallo!</h1>
          <p className="text-zinc-700 text-[10px] uppercase tracking-[0.3em] font-bold">Identità Digitale</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-3 text-left">
          <input 
            type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-800"
            required
          />
          <input 
            type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-800"
            required
          />
          <button type="submit" disabled={loading} className="w-full bg-white text-zinc-950 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.98]">
            {loading ? '...' : mode === 'login' ? 'Entra nel Vallo' : 'Registrati'}
          </button>
        </form>
        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-[10px] text-zinc-600 uppercase tracking-widest hover:text-white transition-colors">
          {mode === 'login' ? 'Crea nuovo account' : 'Torna al login'}
        </button>
      </div>
    </div>
  );
};

// --- STEP 0: IL PATTO ---
const PattoPage = () => {
  const [timer, setTimer] = useState(60);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleNext = async () => {
    await supabase.from('profiles').update({ onboarding_step: 1 }).eq('id', user?.id);
    navigate('/onboarding/identita');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans text-center">
      <div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-2xl">
        <h2 className="text-xl font-bold uppercase italic tracking-tight border-b border-zinc-800 pb-4">Il Patto</h2>
        <div className="space-y-5 text-sm text-zinc-400 leading-relaxed italic text-left">
          <p><span className="text-white font-bold not-italic">01. SILENZIO.</span> Accetti l'attesa forzata. Il tempo è uno strumento.</p>
          <p><span className="text-white font-bold not-italic">02. VERITÀ.</span> Ti impegni all'onestà brutale verso te stesso.</p>
          <p><span className="text-white font-bold not-italic">03. NESSUNA SCUSA.</span> Ogni giustificazione verrà annientata dal sistema.</p>
        </div>
        <div className="pt-6 flex flex-col items-center">
          {timer > 0 ? (
            <div className="text-6xl font-light text-zinc-800 tabular-nums animate-pulse font-mono tracking-tighter">{timer}s</div>
          ) : (
            <button onClick={handleNext} className="w-full bg-white text-zinc-950 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.98]">
              Sottoscrivo il Patto
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- STEP 1: IDENTITÀ ---
const IdentitaPage = () => {
  const [name, setName] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    await supabase.from('profiles').update({ name, onboarding_step: 2 }).eq('id', user?.id);
    navigate('/onboarding/pietra-miliare');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 text-center font-sans">
      <form onSubmit={handleSave} className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 space-y-10 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold uppercase italic tracking-tight">Identità</h2>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black leading-none">Come deve chiamarti il Consiglio?</p>
        </div>
        <input 
          type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="NOME..." 
          className="w-full bg-transparent border-b border-zinc-800 py-4 text-center text-4xl font-black uppercase focus:border-white outline-none transition-all placeholder:text-zinc-900"
          autoFocus
        />
        <button type="submit" className="w-full bg-white text-zinc-950 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200">
          Conferma
        </button>
      </form>
    </div>
  );
};

// --- STEP 2: OBIETTIVO ---
const PietraMiliarePage = () => {
  const [goal, setGoal] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSave = async () => {
    if (goal.trim().length < 10) return toast.error("Troppo breve. Sii onesto.");
    await supabase.from('profiles').update({ goal, onboarding_step: 3 }).eq('id', user?.id);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 space-y-10 shadow-2xl text-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold uppercase italic tracking-tight">Obiettivo</h2>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black leading-none">Cosa vuoi distruggere oggi?</p>
        </div>
        <textarea 
          value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="IL MIO OBIETTIVO REALE È..."
          className="w-full h-40 bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl text-sm uppercase focus:border-zinc-500 outline-none resize-none transition-all placeholder:text-zinc-900 font-medium leading-relaxed"
        />
        <button onClick={handleSave} className="w-full bg-white text-zinc-950 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-[0.98]">
          Attiva Protocollo
        </button>
      </div>
    </div>
  );
};

// --- PAGINA HOME ---
const HomePage = () => (
  <OnboardingGuard>
    <div className="min-h-screen bg-black text-white p-10 flex flex-col justify-center items-center text-center font-sans">
      <div className="relative group">
        <div className="absolute -inset-10 bg-white/5 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="w-24 h-24 rounded-full border border-zinc-900 flex items-center justify-center mx-auto opacity-10 text-4xl grayscale">👁️</div>
      </div>
      <div className="mt-16 space-y-4">
        <p className="text-zinc-700 text-[10px] uppercase tracking-[1em] font-black leading-none">Protocollo Attivo</p>
        <p className="text-zinc-500 text-xs italic max-w-xs mx-auto leading-relaxed">
          Il Consiglio sta analizzando i tuoi dati. 
          Il silenzio è iniziato. Attendi il segnale.
        </p>
      </div>
      <footer className="mt-32">
        <p className="text-[8px] text-zinc-900 uppercase tracking-[1.5em] font-black">Nessuna Scusa</p>
      </footer>
    </div>
  </OnboardingGuard>
);

// --- COMPONENTE MAIN ---
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors theme="dark" />
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/onboarding/patto" element={<PattoPage />} />
          <Route path="/onboarding/identita" element={<IdentitaPage />} />
          <Route path="/onboarding/pietra-miliare" element={<PietraMiliarePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
