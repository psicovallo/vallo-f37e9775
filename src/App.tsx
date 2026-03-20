import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
// Importazione ESM stabile
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.1/+esm';

// --- CONFIGURAZIONE SUPABASE ---
const supabaseUrl = 'https://osodrojmtefahxsiwdqz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2Ryb2ptdGVmYWh4c2l3ZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTM0MzQsImV4cCI6MjA4OTU4OTQzNH0.hOtE9IPXrvnb9Gh5gUCPFbYdNh4Gao0OBZaWN0ys5mg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- CONTESTO DI AUTENTICAZIONE (BYPASS MODE) ---
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

// --- PAGINA ACCESSO (UN SOLO TASTO) ---
const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Se loggato, vai in home
  useEffect(() => { if (user) navigate('/home'); }, [user, navigate]);

  const handleBypassEntry = async () => {
    setLoading(true);
    try {
      // Accesso Anonimo: Nessuna email, nessuna password, entra e basta.
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        // Fallback estremo se Supabase dà problemi: creiamo un utente "finto" locale per sbloccare la UI
        toast.error("Errore server, ma ti sblocco l'accesso locale.");
        window.location.href = "/home"; 
      } else {
        toast.success("Protocollo bypassato. Benvenuto.");
      }
    } catch (err) {
      toast.error("Errore critico. Reindirizzamento forzato.");
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[340px] space-y-12 text-center">
        <div className="space-y-2">
          <h1 className="text-6xl font-black italic uppercase tracking-tighter text-orange-500">Vallo!</h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.5em] font-bold">Accesso Diretto</p>
        </div>
        
        <div className="pt-8">
          <button 
            onClick={handleBypassEntry}
            disabled={loading}
            className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-orange-500 transition-all active:scale-[0.95] shadow-[0_0_30px_rgba(234,88,12,0.2)]"
          >
            {loading ? 'Sblocco...' : 'ENTRA NEL VALLO'}
          </button>
        </div>

        <p className="text-[10px] text-zinc-800 uppercase tracking-[0.3em] font-medium italic leading-relaxed">
          Nessuna verifica. <br/>Il protocollo è aperto.
        </p>
      </div>
    </div>
  );
};

// --- HOME PAGE ---
const HomePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-2 border-zinc-900 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-10 flex flex-col justify-between items-center text-center font-sans">
      <header className="w-full flex justify-between items-center opacity-30">
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-orange-500">Vallo!</h1>
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
      </header>
      
      <main className="space-y-8 flex-1 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute -inset-10 bg-orange-500/10 rounded-full blur-3xl opacity-50 animate-pulse" />
          <div className="w-32 h-32 rounded-full border border-zinc-900 flex items-center justify-center mx-auto text-5xl text-orange-500 shadow-inner">👁️</div>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black uppercase italic tracking-tight">Accesso Eseguito</h2>
          <p className="text-zinc-500 text-xs italic max-w-xs mx-auto leading-relaxed">
            Sei all'interno del sistema. Tutte le verifiche sono state disattivate come richiesto.
          </p>
        </div>
        <button 
          onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
          className="mt-8 px-8 py-3 border border-zinc-900 rounded-full text-[10px] text-zinc-600 uppercase tracking-widest hover:text-orange-500 hover:border-orange-900 transition-all font-bold"
        >
          Riesci dal Vallo
        </button>
      </main>

      <footer className="w-full">
        <p className="text-[8px] text-zinc-900 uppercase tracking-[1.5em] font-black italic">Nessuna Scusa</p>
      </footer>
    </div>
  );
};

// --- APP COMPONENT ---
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors theme="dark" />
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
