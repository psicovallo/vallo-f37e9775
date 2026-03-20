import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
// Caricamento diretto per evitare errori di pacchetti mancanti in fase di anteprima
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

/**
 * CONFIGURAZIONE SUPABASE
 * Collegata al tuo progetto osodrojmtefahxsiwdqz
 */
const supabaseUrl = 'https://osodrojmtefahxsiwdqz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2Ryb2ptdGVmYWh4c2l3ZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTM0MzQsImV4cCI6MjA4OTU4OTQzNH0.hOtE9IPXrvnb9Gh5gUCPFbYdNh4Gao0OBZaWN0ys5mg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 1. CONTESTO DI AUTENTICAZIONE ---
const AuthContext = createContext<any>(undefined);

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

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  return context;
};

// --- 2. PAGINA DI ACCESSO (AUTH) ---
const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/home');
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isRegistering 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    
    setLoading(false);
    if (error) toast.error(error.message);
    else if (isRegistering) toast.success("Verifica l'email o accedi.");
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-zinc-900 p-8 space-y-8 bg-zinc-950/50">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-center">Vallo!</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-white outline-none uppercase"
          />
          <input 
            type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-white outline-none uppercase"
          />
          <button type="submit" disabled={loading} className="w-full bg-white text-black py-4 font-black uppercase text-xs hover:bg-zinc-200">
            {loading ? 'SINC...' : isRegistering ? 'CREA ACCOUNT' : 'ENTRA NEL PATTO'}
          </button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-[10px] uppercase text-zinc-600 hover:text-white">
          {isRegistering ? 'Hai già un account? Accedi' : 'Nuovo utente? Registrati'}
        </button>
      </div>
    </div>
  );
};

// --- 3. GUARDIA DI SICUREZZA (ONBOARDING) ---
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function checkStep() {
      if (!user) return setLoading(false);
      try {
        let { data, error } = await supabase.from('profiles').select('onboarding_step').eq('id', user.id).single();
        if (error && (error.code === 'PGRST116')) {
          await supabase.from('profiles').insert([{ id: user.id, onboarding_step: 0 }]);
          setStep(0);
        } else {
          setStep(data?.onboarding_step ?? 0);
        }
      } catch (err) { setStep(0); }
      finally { setLoading(false); }
    }
    if (!authLoading) checkStep();
  }, [user, authLoading]);

  if (authLoading || loading) return <div className="h-screen bg-black text-white font-mono flex items-center justify-center uppercase text-[10px] animate-pulse">Sincronizzazione...</div>;
  if (!user) return <Navigate to="/" replace />;
  
  const isOnboarding = location.pathname.startsWith('/onboarding');
  if (step !== null && step < 3 && !isOnboarding) {
    const targets = ['/onboarding/patto', '/onboarding/identita', '/onboarding/pietra-miliare'];
    return <Navigate to={targets[step] || '/onboarding/patto'} replace />;
  }
  return <>{children}</>;
};

// --- 4. STEP ONBOARDING ---
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

  const accetta = async () => {
    await supabase.from('profiles').update({ onboarding_step: 1 }).eq('id', user?.id);
    navigate('/onboarding/identita');
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-zinc-800 p-8 space-y-6">
        <h1 className="text-2xl font-black uppercase italic border-b border-zinc-900 pb-4">Il Patto</h1>
        <div className="text-[11px] text-zinc-500 space-y-4 uppercase leading-relaxed">
          <p>[1] Accetti il silenzio. Il tempo è necessario.</p>
          <p>[2] Accetti il divieto di scuse. Qui non servono.</p>
          <p>[3] Accetti la verità cruda.</p>
        </div>
        <div className="pt-4 text-center">
          {timer > 0 ? <div className="text-4xl font-bold text-zinc-800 tabular-nums">{timer}s</div> : (
            <button onClick={accetta} className="w-full bg-white text-black py-4 font-black uppercase text-xs">Firma il Patto</button>
          )}
        </div>
      </div>
    </div>
  );
};

const IdentitaPage = () => {
  const [name, setName] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.length < 2) return toast.error("Nome troppo breve.");
    await supabase.from('profiles').update({ name, onboarding_step: 2 }).eq('id', user?.id);
    navigate('/onboarding/pietra-miliare');
  };
  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6">
      <form onSubmit={salva} className="max-w-md w-full border border-zinc-800 p-8 space-y-8 text-center">
        <h1 className="text-2xl font-black uppercase italic">Identità</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Chi sei quando nessuno ti guarda?</p>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b border-zinc-800 py-3 text-center text-xl font-bold outline-none uppercase" placeholder="NOME" autoFocus />
        <button type="submit" className="w-full bg-white text-black py-4 font-black uppercase text-xs">Conferma</button>
      </form>
    </div>
  );
};

const PietraMiliarePage = () => {
  const [goal, setGoal] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const salva = async () => {
    if (goal.length < 10) return toast.error("Sii specifico.");
    await supabase.from('profiles').update({ goal, onboarding_step: 3 }).eq('id', user?.id);
    navigate('/home');
  };
  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full border border-zinc-800 p-8 space-y-8">
        <h1 className="text-2xl font-black uppercase italic">Pietra Miliare</h1>
        <p className="text-[10px] text-zinc-500 uppercase leading-relaxed">Definisci l'obiettivo. Niente scuse.</p>
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full h-32 bg-transparent border border-zinc-800 p-4 text-xs resize-none outline-none uppercase" placeholder="IL MIO OBIETTIVO..." />
        <button onClick={salva} className="w-full bg-white text-black py-4 font-black uppercase text-xs">Attiva Vallo!</button>
      </div>
    </div>
  );
};

// --- 5. APP ENTRY POINT ---
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
          <Route path="/home" element={
            <OnboardingGuard>
              <div className="min-h-screen bg-black text-white font-mono p-10 flex flex-col justify-between items-center text-center">
                <header className="border-b border-zinc-900 w-full pb-10">
                  <h1 className="text-6xl font-black uppercase tracking-tighter italic">Vallo!</h1>
                  <p className="text-zinc-700 text-[10px] mt-2 tracking-[0.5em] uppercase">Sistema Attivo</p>
                </header>
                <main><p className="text-zinc-500 text-xs uppercase animate-pulse tracking-widest italic">Attesa protocollo riflessione...</p></main>
                <footer className="text-[8px] text-zinc-900 uppercase tracking-[0.8em] border-t border-zinc-900 w-full pt-8">Il Consiglio ti osserva</footer>
              </div>
            </OnboardingGuard>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}