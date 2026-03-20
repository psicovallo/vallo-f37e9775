import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
// Importazione ESM ultra-stabile
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

// --- GATEWAY SENZA ATTRITO ---
const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate('/home'); }, [user, navigate]);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Prova il login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        // Se fallisce, crea l'utente ed entra
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        
        if (signUpData.user && !signUpData.session) {
          // Forza login se necessario
          await supabase.auth.signInWithPassword({ email, password });
        }
        toast.success("Identità creata. Benvenuto.");
      } else {
        toast.success("Bentornato.");
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
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-orange-500">Vallo!</h1>
        <form onSubmit={handleAccess} className="space-y-4 text-left">
          <input 
            type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-sm outline-none focus:border-orange-500 transition-all"
            required
          />
          <input 
            type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-sm outline-none focus:border-orange-500 transition-all"
            required
          />
          <button type="submit" disabled={loading} className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500">
            {loading ? 'ACCESSO...' : 'Entra Subito'}
          </button>
        </form>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Nessuna barriera. Inserisci ed entra.</p>
      </div>
    </div>
  );
};

// --- HOME PAGE DIRETTA ---
const HomePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-orange-500 font-mono">CARICAMENTO...</div>;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-10 flex flex-col justify-center items-center text-center font-sans">
      <div className="w-24 h-24 rounded-full border border-zinc-900 flex items-center justify-center mb-8 text-4xl text-orange-500 opacity-50">👁️</div>
      <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Protocollo Attivo</h1>
      <p className="text-zinc-500 text-sm max-w-xs mb-12">Sei dentro il sistema. Ogni barriera è stata rimossa per permetterti l'azione immediata.</p>
      <button 
        onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
        className="text-[10px] text-orange-500 uppercase tracking-[0.3em] font-bold border-b border-orange-900 pb-1 hover:text-orange-400 transition-colors"
      >
        Esci dal Vallo
      </button>
    </div>
  );
};

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
