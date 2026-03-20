import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { Flame, Bell, Target, Settings, ArrowRight, ShieldCheck, LogOut, Smartphone, HeartPulse, Activity } from 'lucide-react';
// Importazione ESM via esm.sh per garantire stabilità e compatibilità PWA
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

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

  return <AuthContext.Provider value={{ user, setUser, loading }}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

// --- COMPONENTI UI ATOMICI ---
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/40 border border-zinc-800/60 rounded-[2.5rem] p-8 backdrop-blur-xl ${className}`}>
    {children}
  </div>
);

// --- GUARDIA ONBOARDING (IL CASELLO) ---
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono space-y-4">
      <div className="w-10 h-10 border-2 border-zinc-900 border-t-orange-500 rounded-full animate-spin" />
      <div className="text-orange-500 text-[10px] uppercase tracking-[0.4em] animate-pulse italic">Sincronizzazione...</div>
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

// --- PAGINA ACCESSO (COMANDO UNIFICATO: ENTRA) ---
const AuthPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const handleEntry = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      toast.success("Accesso eseguito.");
    } catch (err) {
      setUser({ id: 'local-master', email: 'vallo@system.local' });
      toast.info("Modalità Operativa Locale Attiva");
    } finally {
      setIsConnecting(false);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center font-sans overflow-hidden">
      <div className="mb-24 relative">
        <div className="absolute -inset-20 bg-orange-600/10 rounded-full blur-[100px] animate-pulse" />
        <Flame className="w-28 h-28 text-orange-500 mx-auto mb-8 relative z-10 drop-shadow-[0_0_25px_rgba(234,88,12,0.5)]" />
        <h1 className="text-8xl font-black italic uppercase tracking-tighter text-white relative z-10 leading-none">Vallo!</h1>
        <p className="text-zinc-600 uppercase tracking-[0.6em] text-[11px] mt-6 font-black italic">Il Silenzio è Potere</p>
      </div>
      
      <button 
        onClick={handleEntry}
        disabled={isConnecting}
        className="w-full max-w-sm bg-orange-600 text-white py-7 rounded-[2.5rem] font-black text-3xl uppercase tracking-widest hover:bg-orange-500 transition-all shadow-[0_25px_70px_rgba(234,88,12,0.3)] active:scale-95 border border-orange-400/20"
      >
        {isConnecting ? '...' : 'ENTRA'}
      </button>
      
      <div className="mt-20 flex items-center gap-4 text-zinc-800 text-[10px] uppercase font-black tracking-[0.3em]">
        <Smartphone size={16} className="opacity-40" /> 
        <span>Installazione PWA Attiva</span>
      </div>
    </div>
  );
};

// --- DASHBOARD HUB (IL CUORE GRAFICO RIPRISTINATO) ---
const Dashboard = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const logout = () => {
    supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-16 font-sans animate-in fade-in duration-1000">
      <header className="flex justify-between items-start mb-16 max-w-7xl mx-auto w-full px-4">
        <div className="space-y-2">
          <p className="text-orange-500 uppercase tracking-[0.4em] text-[10px] font-black italic flex items-center gap-2">
            <Activity size={12} /> Sistema Operativo Attivo
          </p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Vallo Hub</h1>
        </div>
        <button onClick={logout} className="p-5 bg-zinc-900/60 rounded-[1.5rem] border border-zinc-800/50 text-zinc-600 hover:text-orange-500 hover:border-orange-500 transition-all shadow-xl">
          <LogOut size={24} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full px-4">
        {/* CARD PROTOCOLLO (FIAMMA) */}
        <Link to="/protocollo/patto" className="group lg:col-span-2">
          <Card className="h-full border-orange-900/20 group-hover:border-orange-500/60 transition-all relative overflow-hidden bg-gradient-to-br from-zinc-900/80 via-zinc-900/40 to-orange-950/15 shadow-2xl">
            <div className="absolute top-[-25%] right-[-15%] p-12 opacity-[0.02] group-hover:opacity-[0.1] transition-all duration-1000 rotate-12 scale-125">
              <Flame size={450} className="text-orange-500" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-16 h-16 bg-orange-600 rounded-[1.5rem] flex items-center justify-center mb-10 shadow-[0_15px_40px_rgba(234,88,12,0.4)]">
                  <Flame className="text-white" size={32} />
                </div>
                <h3 className="text-4xl font-black uppercase italic mb-4 text-white tracking-tighter">Protocollo Fiamma</h3>
                <p className="text-zinc-500 text-lg mb-16 max-w-md leading-relaxed italic opacity-80">Affronta il Ciclo dei 9 incontri con il Consiglio. Distruggi i bias e le scuse attraverso il silenzio assoluto.</p>
              </div>
              <div className="inline-flex items-center gap-4 text-orange-500 text-xs font-black uppercase tracking-[0.4em]">
                ATTIVA ORA <ArrowRight size={20} />
              </div>
            </div>
          </Card>
        </Link>

        {/* NOTIFICHE/PROMEMORIA */}
        <Card className="border-zinc-800/40 flex flex-col justify-between h-full min-h-[320px]">
          <div className="flex items-center gap-4 mb-8">
            <Bell className="text-zinc-600" size={24} />
            <h3 className="text-xl font-black uppercase italic text-zinc-300 tracking-tight">Promemoria</h3>
          </div>
          <div className="space-y-5">
            <div className="p-5 bg-zinc-950/70 border border-zinc-800 rounded-3xl flex justify-between items-center opacity-30">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Riflessione</span>
              <span className="text-[11px] font-mono text-zinc-700 italic">OFF</span>
            </div>
            <div className="p-5 bg-zinc-950/70 border border-orange-900/50 rounded-3xl flex justify-between items-center shadow-[inset_0_0_30px_rgba(234,88,12,0.05)] border-orange-500/20">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Consiglio</span>
              <span className="text-[11px] font-mono text-orange-500 animate-pulse font-bold tracking-tighter">PENDENTE</span>
            </div>
          </div>
        </Card>

        {/* PIETRE MILIARI */}
        <Card className="border-zinc-800/40 min-h-[320px]">
          <div className="flex items-center gap-4 mb-10">
            <Target className="text-zinc-600" size={24} />
            <h3 className="text-xl font-black uppercase italic text-zinc-300 tracking-tight">Obiettivi</h3>
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">
                <span>Identità Master</span>
                <span>12%</span>
              </div>
              <div className="h-2 w-full bg-zinc-950 rounded-full border border-zinc-800/60 overflow-hidden p-[2px]">
                <div className="h-full bg-orange-600 rounded-full w-[12%] shadow-[0_0_20px_rgba(234,88,12,0.6)]"></div>
              </div>
            </div>
            <p className="text-[10px] text-zinc-700 uppercase leading-relaxed font-bold tracking-[0.1em] italic">La pietra miliare 0 è stata posata. In attesa del carburante cognitivo per il prossimo scatto.</p>
          </div>
        </Card>

        {/* INTEGRITÀ FISICA/MENTALE */}
        <Card className="border-zinc-800/40 bg-zinc-900/30">
          <div className="flex items-center gap-4 mb-6">
            <HeartPulse className="text-zinc-600" size={24} />
            <h3 className="text-xl font-black uppercase italic text-zinc-300 tracking-tight">Integrità</h3>
          </div>
          <p className="text-zinc-500 text-sm leading-relaxed italic opacity-70">Monitoraggio onestà intellettuale in corso. Protocollo di rilevamento scuse attivo. Zero anomalie.</p>
        </Card>

        {/* IMPOSTAZIONI */}
        <Card className="border-zinc-800/40 hover:border-orange-500/40 transition-all cursor-pointer group flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-800 group-hover:border-orange-900 transition-all shadow-inner">
              <Settings className="text-zinc-600 group-hover:text-orange-500 transition-colors" size={26} />
            </div>
            <h3 className="text-xl font-black uppercase italic text-zinc-300 group-hover:text-white transition-colors">Opzioni</h3>
          </div>
          <ArrowRight size={22} className="text-zinc-800 group-hover:text-orange-500 transition-all" />
        </Card>
      </div>

      <footer className="mt-24 text-center border-t border-zinc-900/50 pt-12 pb-10 opacity-30">
        <p className="text-[10px] text-zinc-800 uppercase tracking-[1.8em] font-black italic">Nessuna Scusa • v1.0.8-Master</p>
      </footer>
    </div>
  );
};

// --- IL PATTO (CONTRATTO MASTER 60S) ---
const PattoPage = () => {
  const [timer, setTimer] = useState(60); // Ripristinato a 60 secondi come da Master
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleSottoscrivo = async () => {
    if (!user) return;
    try {
      await supabase.from('profiles').update({ onboarding_step: 1 }).eq('id', user.id);
      navigate('/protocollo/attivo');
    } catch (err) { navigate('/protocollo/attivo'); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white font-sans animate-in zoom-in duration-1000">
      <div className="max-w-2xl w-full border border-orange-500/15 p-12 md:p-20 bg-zinc-900/50 rounded-[4rem] relative overflow-hidden backdrop-blur-3xl shadow-[0_0_100px_rgba(234,88,12,0.05)]">
        <div className="absolute top-0 left-0 w-full h-2 bg-zinc-900">
          <div className="bg-orange-600 h-full transition-all duration-1000 ease-linear shadow-[0_0_30px_rgba(234,88,12,0.8)]" style={{ width: `${(60-timer)*(100/60)}%` }}></div>
        </div>
        
        <div className="flex justify-center mb-16">
          <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-950 border border-orange-500/40 flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(234,88,12,0.1)]">
            <ShieldCheck className="text-orange-500" size={42} />
          </div>
        </div>

        <h2 className="text-5xl font-black uppercase italic mb-12 text-center tracking-tighter text-white leading-none">Il Patto</h2>
        
        <div className="space-y-12 text-base text-zinc-500 leading-relaxed italic border-l-2 border-zinc-800/80 pl-10">
          <p><span className="text-orange-500 font-black not-italic font-mono mr-5 text-lg">01.</span> <strong className="text-zinc-200 not-italic uppercase tracking-[0.2em] text-xs border-b border-zinc-800 pb-2 mb-2 block w-fit">Silenzio</strong><br/>Accetti che il Consiglio imponga i tempi. Ogni tentativo di fuga digitale verrà punito con l'attesa.</p>
          <p><span className="text-orange-500 font-black not-italic font-mono mr-5 text-lg">02.</span> <strong className="text-zinc-200 not-italic uppercase tracking-[0.2em] text-xs border-b border-zinc-800 pb-2 mb-2 block w-fit">Verità</strong><br/>Ti impegni all'onestà brutale. Il sistema analizza le scuse e le annienta sul nascere.</p>
          <p><span className="text-orange-500 font-black not-italic font-mono mr-5 text-lg">03.</span> <strong className="text-zinc-200 not-italic uppercase tracking-[0.2em] text-xs border-b border-zinc-800 pb-2 mb-2 block w-fit">Responsabilità</strong><br/>Non ci sono premi. L'unico risultato ammesso è la tua totale consapevolezza dei tuoi fallimenti.</p>
        </div>

        <div className="mt-20 text-center">
          {timer > 0 ? (
            <div className="space-y-6">
              <div className="text-8xl font-light text-orange-500 tabular-nums font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(234,88,12,0.3)]">{timer}s</div>
              <p className="text-[11px] uppercase text-zinc-700 tracking-[0.6em] font-black italic">Assimilazione vincolo in corso...</p>
            </div>
          ) : (
            <button 
              onClick={handleSottoscrivo} 
              className="w-full bg-orange-600 py-7 rounded-[2.5rem] font-black uppercase text-lg tracking-widest hover:bg-orange-500 transition-all shadow-[0_25px_60px_rgba(234,88,12,0.4)] active:scale-95 border border-orange-400/20"
            >
              Sottoscrivo il Patto
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE ENTRY POINT ---
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors theme="dark" expand={false} />
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/dashboard" element={<OnboardingGuard><Dashboard /></OnboardingGuard>} />
          <Route path="/onboarding/patto" element={<PattoPage />} />
          <Route path="/protocollo/attivo" element={
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-12 animate-in fade-in duration-1000">
              <div className="relative mb-16">
                <div className="absolute -inset-24 bg-orange-600/10 rounded-full blur-[120px] animate-pulse" />
                <Flame size={120} className="text-orange-500 relative z-10 drop-shadow-[0_0_20px_rgba(234,88,12,0.4)]" />
              </div>
              <h2 className="text-6xl font-black uppercase italic mb-8 tracking-tighter text-white leading-none">Fiamma Accesa</h2>
              <p className="text-zinc-600 text-lg max-w-sm mb-16 leading-relaxed italic opacity-80">Il protocollo è attivo. Il Consiglio ha iniziato la scansione della tua identità. Resta nel silenzio.</p>
              <Link to="/dashboard" className="text-[11px] uppercase font-black text-orange-500 border-b-2 border-orange-900 pb-4 hover:border-orange-500 transition-all tracking-[0.5em] italic">Torna all'Hub Centrale</Link>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
