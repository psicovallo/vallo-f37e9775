import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
// Importazione ESM stabile
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.1/+esm';

// --- CONFIGURAZIONE SUPABASE ---
const supabaseUrl = 'https://osodrojmtefahxsiwdqz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2Ryb2ptdGVmYWh4c2l3ZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTM0MzQsImV4cCI6MjA4OTU4OTQzNH0.hOtE9IPXrvnb9Gh5gUCPFbYdNh4Gao0OBZaWN0ys5mg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AuthContext = createContext<any>({ user: null, loading: true });

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

// --- GUARDIA DI SICUREZZA ---
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkStep = async () => {
      if (!user) return setLoading(false);
      try {
        const { data, error } = await supabase.from('profiles').select('onboarding_step').eq('id', user.id).single();
        if (error && error.code === 'PGRST116') {
          await supabase.from('profiles').insert([{ id: user.id, onboarding_step: 0 }]);
          setStep(0);
        } else {
          setStep(data?.onboarding_step ?? 0);
        }
      } catch (err) { setStep(0); }
      finally { setLoading(false); }
    };
    if (!authLoading) checkStep();
  }, [user, authLoading]);

  if (authLoading || loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono">
      <div className="text-zinc-600 text-[10px] uppercase tracking-[0.4em] animate-pulse">Sincronizzazione Identità...</div>
    </div>
  );

  if (!user) return <Navigate to="/" replace />;
  
  const isOnboarding = location.pathname.startsWith('/onboarding');
  if (step !== null && step < 3 && !isOnboarding) {
    const routes = ['/onboarding/patto', '/onboarding/identita', '/onboarding/pietra-miliare'];
    return <Navigate to={routes[step] || '/onboarding/patto'} replace />;
  }
  return <>{children}</>;
};

// --- GATEWAY UNIFICATO ---
const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate('/home'); }, [user, navigate]);

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowReset(false);
    
    try {
      // 1. TENTATIVO ACCESSO DIRETTO
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        // 2. SE L'ERRORE È CREDENZIALI ERRATE SU UTENTE ESISTENTE
        if (signInError.message.toLowerCase().includes("invalid login credentials")) {
          // Verifichiamo se l'utente esiste tentando il signup
          const { error: signUpError } = await supabase.auth.signUp({ email, password });
          if (signUpError?.message.includes("already registered")) {
            toast.error("Identità esistente. Password errata.");
            setShowReset(true);
            setLoading(false);
            return;
          }
          // Se non è registrato, il signup procede sotto
        }

        // 3. TENTATIVO REGISTRAZIONE (UTENTE NUOVO O NON CONFERMATO)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        
        if (signUpError) throw signUpError;

        if (signUpData.user) {
          toast.success("Identità creata. Entra nel protocollo.");
          // Se non c'è sessione automatica, forziamo il login
          if (!signUpData.session) {
            await supabase.auth.signInWithPassword({ email, password });
          }
        }
      } else {
        toast.success("Accesso eseguito.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[340px] space-y-12 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Vallo!</h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.4em] font-bold">Identità Protocollo</p>
        </div>
        
        <form onSubmit={handleEntry} className="space-y-4 text-left">
          <input 
            type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-700"
            required
          />
          <input 
            type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-700"
            required
          />
          <button type="submit" disabled={loading} className="w-full bg-zinc-100 text-zinc-950 py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all">
            {loading ? 'Sincronizzazione...' : 'Entra nel Vallo'}
          </button>
        </form>

        {showReset && (
          <button 
            onClick={() => supabase.auth.resetPasswordForEmail(email).then(() => toast.success("Email inviata"))}
            className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold hover:text-white underline decoration-zinc-800"
          >
            Recupera Password
          </button>
        )}

        <p className="text-[9px] text-zinc-800 uppercase tracking-[0.3em] font-medium italic">
          Protocollo di accesso unificato. Nessun ostacolo.
        </p>
      </div>
    </div>
  );
};

// --- PAGINA PATTO ---
const PattoPage = () => {
  const [timer, setTimer] = useState(60);
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (timer > 0) { const t = setTimeout(() => setTimer(timer - 1), 1000); return () => clearTimeout(t); } }, [timer]);
  const handleNext = async () => {
    await supabase.from('profiles').update({ onboarding_step: 1 }).eq('id', user?.id);
    navigate('/onboarding/identita');
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 space-y-10 shadow-2xl">
        <h2 className="text-xl font-black uppercase italic tracking-tight border-b border-zinc-800 pb-4 text-center">Il Patto</h2>
        <div className="space-y-5 text-sm text-zinc-400 leading-relaxed italic text-left">
          <p><span className="text-zinc-100 font-bold not-italic">01. SILENZIO.</span> Accetti l'attesa forzata.</p>
          <p><span className="text-zinc-100 font-bold not-italic">02. VERITÀ.</span> Ti impegni all'onestà brutale.</p>
          <p><span className="text-zinc-100 font-bold not-italic">03. NESSUNA SCUSA.</span> Ogni giustificazione verrà annientata.</p>
        </div>
        <div className="pt-6 text-center">
          {timer > 0 ? (
            <div className="text-6xl font-light text-zinc-800 tabular-nums animate-pulse font-mono tracking-tighter">{timer}s</div>
          ) : (
            <button onClick={handleNext} className="w-full bg-zinc-100 text-zinc-950 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all">
              Sottoscrivo il Patto
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- PAGINA IDENTITÀ ---
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 text-center">
      <form onSubmit={handleSave} className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 space-y-10 shadow-2xl">
        <h2 className="text-2xl font-black uppercase italic tracking-tight">Identità</h2>
        <input 
          type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="NOME..." 
          className="w-full bg-transparent border-b border-zinc-800 py-4 text-center text-3xl font-black uppercase focus:border-white outline-none transition-all placeholder:text-zinc-900"
          autoFocus
        />
        <button type="submit" className="w-full bg-zinc-100 text-zinc-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all">
          Conferma
        </button>
      </form>
    </div>
  );
};

// --- PAGINA OBIETTIVO ---
const PietraMiliarePage = () => {
  const [goal, setGoal] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleSave = async () => {
    if (goal.trim().length < 10) return toast.error("Troppo breve.");
    await supabase.from('profiles').update({ goal, onboarding_step: 3 }).eq('id', user?.id);
    navigate('/home');
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-3xl p-12 space-y-10 shadow-2xl text-center">
        <h2 className="text-2xl font-black uppercase italic tracking-tight">Obiettivo</h2>
        <textarea 
          value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="COSA VUOI DISTRUGGERE OGGI?"
          className="w-full h-40 bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl text-sm uppercase focus:border-zinc-500 outline-none resize-none transition-all placeholder:text-zinc-900"
        />
        <button onClick={handleSave} className="w-full bg-zinc-100 text-zinc-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all">
          Attiva Vallo!
        </button>
      </div>
    </div>
  );
};

// --- HOME ---
const HomePage = () => (
  <OnboardingGuard>
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-10 flex flex-col justify-center items-center text-center font-sans">
      <div className="w-24 h-24 rounded-full border border-zinc-900 flex items-center justify-center opacity-10 text-4xl">👁️</div>
      <div className="mt-16 space-y-4">
        <p className="text-zinc-700 text-[10px] uppercase tracking-[1em] font-black leading-none italic">Protocollo Attivo</p>
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
