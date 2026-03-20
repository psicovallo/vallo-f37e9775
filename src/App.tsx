import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { Flame, Bell, Target, Settings, User, ArrowRight, ShieldCheck, Clock, BookOpen, LogOut } from 'lucide-react';
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

// --- COMPONENTI UI COMUNI ---
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

// --- PAGINA ACCESSO (BYPASS VELOCE) ---
const AuthPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => { if (user) navigate('/dashboard'); }, [user]);

  const handleEntry = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) toast.error("Errore server. Riprova.");
    else navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-12">
        <Flame className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-pulse" />
        <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white">Vallo!</h1>
        <p className="text-zinc-500 uppercase tracking-[0.4em] text-[10px] mt-2 font-bold">L'evoluzione del Silenzio</p>
      </div>
      <button 
        onClick={handleEntry}
        className="w-full max-w-xs bg-orange-600 text-white py-5 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-orange-500 transition-all shadow-[0_0_40px_rgba(234,88,12,0.15)]"
      >
        Entra nel Vallo
      </button>
      <p className="mt-8 text-zinc-800 text-[10px] uppercase font-bold tracking-widest">Protocollo Installabile PWA Attivo</p>
    </div>
  );
};

// --- DASHBOARD PRINCIPALE (HUB) ---
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 font-sans">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-zinc-500 uppercase tracking-widest text-[10px] font-black">Benvenuto, Identità</h2>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Vallo Hub</h1>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => navigate('/'))} className="p-3 bg-zinc-900 rounded-full border border-zinc-800 text-zinc-500 hover:text-orange-500 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SEZIONE FIAMMA (IL CUORE) */}
        <Link to="/protocollo" className="group">
          <Card className="h-full border-orange-900/30 group-hover:border-orange-500 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
              <Flame size={120} className="text-orange-500" />
            </div>
            <div className="relative z-10">
              <Flame className="text-orange-500 mb-4" />
              <h3 className="text-xl font-bold uppercase italic mb-2">Protocollo Fiamma</h3>
              <p className="text-zinc-500 text-sm mb-6">Affronta il Ciclo dei 9. Distruggi i tuoi bias cognitivi nel silenzio.</p>
              <div className="inline-flex items-center gap-2 text-orange-500 text-[10px] font-black uppercase tracking-widest">
                Attiva Protocollo <ArrowRight size={14} />
              </div>
            </div>
          </Card>
        </Link>

        {/* SEZIONE PROMEMORIA */}
        <Card className="border-zinc-800/50">
          <Bell className="text-zinc-500 mb-4" />
          <h3 className="text-xl font-bold uppercase italic mb-2">Promemoria</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl opacity-50">
              <span className="text-xs uppercase font-medium">Riflessione Mattutina</span>
              <span className="text-[10px] font-mono">08:00</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
              <span className="text-xs uppercase font-medium text-orange-500">Analisi del Consiglio</span>
              <span className="text-[10px] font-mono text-orange-500">ATTIVA</span>
            </div>
          </div>
        </Card>

        {/* SEZIONE OBIETTIVI */}
        <Card className="border-zinc-800/50">
          <Target className="text-zinc-500 mb-4" />
          <h3 className="text-xl font-bold uppercase italic mb-2">Pietre Miliari</h3>
          <div className="w-full bg-zinc-950 h-2 rounded-full mt-4 overflow-hidden border border-zinc-800">
            <div className="bg-orange-500 h-full w-1/4"></div>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2 uppercase font-bold tracking-widest">Avanzamento Identità: 25%</p>
        </Card>

        {/* SEZIONE CONFIGURAZIONE */}
        <Card className="border-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer">
          <Settings className="text-zinc-500 mb-4" />
          <h3 className="text-xl font-bold uppercase italic mb-2">Impostazioni</h3>
          <p className="text-zinc-500 text-sm">Gestisci notifiche push, identità e dati biometrici.</p>
        </Card>
      </div>

      <footer className="mt-12 text-center">
        <p className="text-[8px] text-zinc-800 uppercase tracking-[1.5em] font-black">Nessuna Scusa • Vallo Master v1.0</p>
      </footer>
    </div>
  );
};

// --- PROTOCOLLO: IL PATTO (DENTRO LA FIAMMA) ---
const PattoPage = () => {
  const [timer, setTimer] = useState(10); // Ridotto per test, era 60
  const navigate = useNavigate();
  useEffect(() => { if (timer > 0) { const t = setTimeout(() => setTimer(timer - 1), 1000); return () => clearTimeout(t); } }, [timer]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white font-mono">
      <div className="max-w-xl w-full border border-orange-900/50 p-8 md:p-12 bg-zinc-900/20 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
          <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${(10-timer)*10}%` }}></div>
        </div>
        <h2 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3">
          <ShieldCheck className="text-orange-500" /> Il Patto Vincolante
        </h2>
        <div className="space-y-6 text-sm text-zinc-400 leading-relaxed italic">
          <p><span className="text-orange-500 font-bold not-italic">I.</span> Accetti il silenzio forzato del sistema.</p>
          <p><span className="text-orange-500 font-bold not-italic">II.</span> Rinunci ad ogni gratificazione digitale immediata.</p>
          <p><span className="text-orange-500 font-bold not-italic">III.</span> Ti impegni all'onestà bruta. Le scuse verranno rimosse.</p>
        </div>
        <div className="mt-12 text-center">
          {timer > 0 ? (
            <div className="text-5xl font-light text-zinc-800 tabular-nums animate-pulse">{timer}s</div>
          ) : (
            <button onClick={() => navigate('/protocollo/attivo')} className="w-full bg-orange-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-500">Accetto il Patto</button>
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
        <Toaster position="top-center" richColors theme="dark" />
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/protocollo" element={<PattoPage />} />
          <Route path="/protocollo/attivo" element={
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-10">
              <Flame size={64} className="text-orange-500 mb-8 animate-pulse" />
              <h2 className="text-3xl font-black uppercase italic mb-4">Fiamma Accesa</h2>
              <p className="text-zinc-500 text-sm max-w-xs mb-8">Il protocollo è ora integrato nella tua dashboard. Attendi la prima notifica push per iniziare il Ciclo dei 9.</p>
              <Link to="/dashboard" className="text-xs uppercase font-black text-orange-500 border-b border-orange-900 pb-1">Torna all'Hub</Link>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
