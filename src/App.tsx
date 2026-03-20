import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
// Importazione ESM ultra-stabile per evitare crash in ambiente browser
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.1/+esm';

// --- CONFIGURAZIONE SUPABASE ---
const supabaseUrl = 'https://osodrojmtefahxsiwdqz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2Ryb2ptdGVmYWh4c2l3ZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTM0MzQsImV4cCI6MjA4OTU4OTQzNH0.hOtE9IPXrvnb9Gh5gUCPFbYdNh4Gao0OBZaWN0ys5mg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- CONTESTO DI AUTENTICAZIONE ---
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

// --- GATEWAY SENZA ATTRITO (ORANGE MASTER) ---
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
      // 1. TENTATIVO ACCESSO (LOGIN)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        // Se errore è password errata su utente esistente (Invalid credentials)
        if (signInError.message.toLowerCase().includes("invalid login credentials")) {
          // Tentiamo il signup per capire se è un nuovo utente o solo pass errata
          const { error: signUpError } = await supabase.auth.signUp({ email, password });
          
          if (signUpError) {
            if (signUpError.message.includes("already registered")) {
              toast.error("Password errata.");
              setShowReset(true);
            } else if (signUpError.status === 429) {
              toast.error("Rate Limit: Supabase ti ha bloccato. Attendi 1 ora o disabilita 'Confirm Email' nella dashboard.");
            } else {
              throw signUpError;
            }
          } else {
            toast.success("Nuova identità registrata.");
          }
        } else {
          throw signInError;
        }
      } else {
        toast.success("Protocollo attivo.");
      }
    } catch (err: any) {
      if (err.status === 429) {
        toast.error("Troppe richieste. Aspetta un'ora o usa un utente già creato manualmente.");
      } else {
        toast.error(err.message || "Errore di connessione.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[340px] space-y-12 text-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-orange-500">Vallo!</h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.4em] font-bold">Inizializzazione Sistema</p>
        </div>
        
        <form onSubmit={handleEntry} className="space-y-4 text-left">
          <input 
            type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-sm outline-none focus:border-orange-500 transition-all placeholder:text-zinc-700"
            required
          />
          <input 
            type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-sm outline-none focus:border-orange-500 transition-all placeholder:text-zinc-700"
            required
          />
          <button type="submit" disabled={loading} className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all">
            {loading ? 'ANALISI...' : 'Entra nel Vallo'}
          </button>
        </form>

        <div className="h-4">
          {showReset && (
            <button 
              onClick={() => supabase.auth.resetPasswordForEmail(email).then(() => toast.success("Email inviata"))}
              className="text-[10px] text-orange-500 uppercase tracking-widest font-bold hover:text-orange-400 underline decoration-orange-900 underline-offset-4"
            >
              Recupera Identità
            </button>
          )}
        </div>

        <p className="text-[10px] text-zinc-800 uppercase tracking-[0.3em] font-medium italic leading-relaxed">
          Nessun ostacolo. Inserisci ed entra. <br/>Il protocollo non ammette ritardi.
        </p>
      </div>
    </div>
  );
};

// --- HOME PAGE (PROTOCOLLO ATTIVO) ---
const HomePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono space-y-4">
      <div className="w-8 h-8 border-2 border-zinc-800 border-t-orange-500 rounded-full animate-spin" />
      <div className="text-orange-500 text-[10px] uppercase tracking-[0.4em] animate-pulse italic">Accesso al Vallo...</div>
    </div>
  );
  
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-10 flex flex-col justify-between items-center text-center font-sans">
      <header className="w-full flex justify-between items-center opacity-30">
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-orange-500">Vallo!</h1>
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
      </header>
      
      <main className="space-y-8 flex-1 flex flex-col justify-center items-center">
        <div className="relative group">
          <div className="absolute -inset-10 bg-orange-500/10 rounded-full blur-3xl opacity-50 animate-pulse" />
          <div className="w-24 h-24 rounded-full border border-zinc-900 flex items-center justify-center mx-auto text-4xl text-orange-500">👁️</div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black uppercase italic tracking-tight">Protocollo Attivo</h2>
          <p className="text-zinc-500 text-xs italic max-w-xs mx-auto leading-relaxed">
            Sei all'interno. Ogni barriera di onboarding è stata rimossa per accelerare il processo. <br/>Resta in attesa del primo stimolo.
          </p>
        </div>
        <button 
          onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
          className="px-6 py-2 border border-zinc-900 rounded-full text-[10px] text-zinc-600 uppercase tracking-widest hover:text-orange-500 transition-all font-bold"
        >
          Disconnetti Identità
        </button>
      </main>

      <footer className="w-full">
        <div className="h-px w-24 bg-zinc-900 mx-auto mb-6 opacity-30" />
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
