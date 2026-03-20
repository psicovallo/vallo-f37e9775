import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { Flame, Bell, Target, Settings, ArrowRight, ShieldCheck, LogOut, Smartphone, HeartPulse } from 'lucide-react';
// Importazione ESM via esm.sh per garantire compatibilità con l'ambiente React
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
    // Sincronizzazione sessione reale
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, setUser, loading }}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

// --- COMPONENTI UI MASTER ---
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

// --- PAGINA ACCESSO (CON FAIL-SAFE) ---
const AuthPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const handleEntry = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.warn("Supabase Error, triggering Fail-Safe...");
        const mockUser = { id: 'local-identity', email: 'vallo@internal.system' };
        setUser(mockUser);
        toast.success("Accesso in Modalità Locale (Server Offline)");
        navigate('/dashboard');
      } else {
        toast.success("Connessione al Vallo stabilita.");
        navigate('/dashboard');
      }
    } catch (err) {
      setUser({ id: 'emergency-auth' });
      navigate('/dashboard');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center font-sans">
      <div className="mb-16 relative">
        <div className="absolute -inset-10 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <Flame className="w-20 h-20 text-orange-500 mx-auto mb-6 relative z-10" />
        <h1 className="text-7xl font-black italic uppercase tracking-tighter text-white relative z-10">Vallo!</h1>
        <p className="text-zinc-600 uppercase tracking-[0.5em] text-[10px] mt-4 font-black">Senza Filtri. Senza Scuse.</p>
      </div>
      
      <button 
        onClick={handleEntry}
        disabled={isConnecting}
        className="w-full max-w-sm bg-orange-600 text-white py-6 rounded-3xl font-black text-xl uppercase tracking-widest hover:bg-orange-500 transition-all shadow-[0_20px_50px_rgba(234,88,12,0.2)] active:scale-[0.98]"
      >
        {isConnecting ? 'SINCRONIZZAZIONE...' : 'ENTRA NEL VALLO'}
      </button>
      
      <div className="mt-12 flex items-center gap-4 text-zinc-800 text-[10px] uppercase font-black tracking-widest">
        <Smartphone size={14} /> 
        <span>Pronta per l'installazione PWA</span>
      </div>
    </div>
  );
};

// --- DASHBOARD HUB ---
const Dashboard = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const logout = () => {
    supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans animate-in fade-in duration-700">
      <header className="flex justify-between items-start mb-12">
        <div>
          <p className="text-orange-500 uppercase tracking-widest text-[10px] font-black mb-1">Status: Operativo</p>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Vallo Hub</h1>
        </div>
        <button onClick={logout} className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-500 hover:text-orange-500 hover:border-orange-500 transition-all">
          <LogOut size={20} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD FIAMMA */}
        <Link to="/protocollo/patto" className="group lg:col-span-2">
          <Card className="h-full border-orange-900/20 group-hover:border-orange-500 transition-all relative overflow-hidden bg-gradient-to-br from-zinc-900/40 to-orange-950/5">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
              <Flame size={180} className="text-orange-500" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(234,88,12,0.4)]">
                <Flame className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase italic mb-3 text-white">Protocollo Fiamma</h3>
              <p className="text-zinc-500 text-sm mb-8 max-w-md leading-relaxed italic">Attiva il ciclo dei 9 incontri con il Consiglio. Distruggi i bias cognitivi attraverso il silenzio e la verità cruda.</p>
              <div className="inline-flex items-center gap-3 text-orange-500 text-xs font-black uppercase tracking-widest">
                INIZIA ORA <ArrowRight size={16} />
              </div>
            </div>
          </Card>
        </Link>

        {/* PROMEMORIA */}
        <Card className="border-zinc-800/30">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-zinc-500" size={20} />
            <h3 className="text-lg font-black uppercase italic">Promemoria</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex justify-between items-center group cursor-pointer hover:border-zinc-700">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Mattina</span>
              <span className="text-xs font-mono text-zinc-700 italic">Disattivo</span>
            </div>
            <div className="p-4 bg-zinc-950/80 border border-orange-900/30 rounded-2xl flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Consiglio</span>
              <span className="text-xs font-mono text-orange-500 animate-pulse">ATTIVO</span>
            </div>
          </div>
        </Card>

        {/* PIETRE MILIARI */}
        <Card className="border-zinc-800/30">
          <div className="flex items-center gap-3 mb-6">
            <Target className="text-zinc-500" size={20} />
            <h3 className="text-lg font-black uppercase italic">Obiettivi</h3>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>Progressi</span>
                <span>12%</span>
              </div>
              <div className="h-2 w-full bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden">
                <div className="h-full bg-orange-600 w-[12%] shadow-[0_0_10px_rgba(234,88,12,0.5)]"></div>
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 uppercase leading-relaxed italic">La pietra miliare 0 è stata posata. Il Consiglio attende il carburante.</p>
          </div>
        </Card>

        {/* HEALTH CHECK */}
        <Card className="border-zinc-800/30">
          <div className="flex items-center gap-3 mb-4">
            <HeartPulse className="text-zinc-500" size={20} />
            <h3 className="text-lg font-black uppercase italic">Integrità</h3>
          </div>
          <p className="text-zinc-500 text-xs leading-relaxed italic">Sistema di monitoraggio onestà intellettuale attivo. Zero anomalie rilevate.</p>
        </Card>

        {/* SETTINGS */}
        <Card className="border-zinc-800/30 hover:border-orange-500 transition-colors cursor-pointer group">
          <Settings className="text-zinc-500 group-hover:text-orange-500 mb-4 transition-colors" size={20} />
          <h3 className="text-lg font-black uppercase italic mb-2">Impostazioni</h3>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Gestione Identità & Push</p>
        </Card>
      </div>

      <footer className="mt-16 text-center border-t border-zinc-900 pt-8">
        <p className="text-[9px] text-zinc-800 uppercase tracking-[1.5em] font-black italic">Nessuna Scusa • v1.0.5-Master</p>
      </footer>
    </div>
  );
};

// --- IL PATTO (IL CONTRATTO ORIGINALE) ---
const PattoPage = () => {
  const [timer, setTimer] = useState(10);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white font-sans animate-in zoom-in duration-500">
      <div className="max-w-xl w-full border border-orange-500/20 p-10 md:p-16 bg-zinc-900/30 rounded-[3rem] relative overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-800">
          <div className="bg-orange-500 h-full transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(234,88,12,0.8)]" style={{ width: `${(10-timer)*10}%` }}></div>
        </div>
        
        <div className="flex justify-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-zinc-950 border border-orange-500/50 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(234,88,12,0.1)]">
            <ShieldCheck className="text-orange-500" size={32} />
          </div>
        </div>

        <h2 className="text-3xl font-black uppercase italic mb-8 text-center tracking-tighter text-white">Il Patto Vincolante</h2>
        
        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed italic border-l border-zinc-800 pl-6">
          <p><span className="text-orange-500 font-black not-italic font-mono mr-3">01.</span> <strong className="text-zinc-100 not-italic uppercase tracking-widest text-[10px] border-b border-zinc-800 pb-1">Silenzio Forzato</strong><br/>Accetti che il Consiglio decida i tempi di attesa. Non puoi forzare il sistema.</p>
          <p><span className="text-orange-500 font-black not-italic font-mono mr-3">02.</span> <strong className="text-zinc-100 not-italic uppercase tracking-widest text-[10px] border-b border-zinc-800 pb-1">Verità Cruda</strong><br/>Ti impegni all'onestà brutale. Ogni scusa rilevata bloccherà il tuo progresso.</p>
          <p><span className="text-orange-500 font-black not-italic font-mono mr-3">03.</span> <strong className="text-zinc-100 not-italic uppercase tracking-widest text-[10px] border-b border-zinc-800 pb-1">Azione Unica</strong><br/>Non ci sono premi. L'unico risultato è la tua consapevolezza.</p>
        </div>

        <div className="mt-16 text-center">
          {timer > 0 ? (
            <div className="space-y-4">
              <div className="text-6xl font-light text-orange-500 tabular-nums font-mono tracking-tighter">{timer}s</div>
              <p className="text-[10px] uppercase text-zinc-600 tracking-[0.4em] font-black italic">Assimilazione vincolo...</p>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/protocollo/attivo')} 
              className="w-full bg-orange-600 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-orange-500 transition-all shadow-[0_15px_30px_rgba(234,88,12,0.3)] active:scale-95"
            >
              Sottoscrivo il Patto
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE MAIN ---
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors theme="dark" expand={false} />
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/protocollo/patto" element={<PattoPage />} />
          <Route path="/protocollo/attivo" element={
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-12 animate-in fade-in duration-1000">
              <div className="relative mb-12">
                <div className="absolute -inset-16 bg-orange-500/5 rounded-full blur-3xl animate-pulse" />
                <Flame size={80} className="text-orange-500 relative z-10" />
              </div>
              <h2 className="text-4xl font-black uppercase italic mb-6 tracking-tighter">Fiamma Accesa</h2>
              <p className="text-zinc-500 text-sm max-w-xs mb-12 leading-relaxed italic">Il protocollo è ora parte della tua identità. Resta nel silenzio e attendi lo stimolo del Consiglio.</p>
              <Link to="/dashboard" className="text-[10px] uppercase font-black text-orange-500 border-b-2 border-orange-900 pb-2 hover:border-orange-500 transition-all tracking-[0.3em]">Torna all'Hub</Link>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
