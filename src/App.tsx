import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { createClient, User } from 'https://www.google.com/search?q=https://esm.sh/%40supabase/supabase-js%402.45.1';

const supabaseUrl = 'https://www.google.com/search?q=https://osodrojmtefahxsiwdqz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2Ryb2ptdGVmYWh4c2l3ZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTM0MzQsImV4cCI6MjA4OTU4OTQzNH0.hOtE9IPXrvnb9Gh5gUCPFbYdNh4Gao0OBZaWN0ys5mg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
supabase.auth.getSession().then(({ data: { session } }) => {
setUser(session?.user ?? null);
setLoading(false);
});
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
setUser(session?.user ?? null);
setLoading(false);
});
return () => subscription.unsubscribe();
}, []);
return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
const { user, loading: authLoading } = useAuth();
const [step, setStep] = useState<number | null>(null);
const [loading, setLoading] = useState(true);
const location = useLocation();

useEffect(() => {
async function checkStep() {
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
}
if (!authLoading) checkStep();
}, [user, authLoading]);

if (authLoading || loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono text-zinc-500 text-[10px] uppercase animate-pulse">Sincronizzazione Identità...</div>;
if (!user) return <Navigate to="/" replace />;
const isOnboarding = location.pathname.startsWith('/onboarding');
if (step !== null && step < 3 && !isOnboarding) {
const routes = ['/onboarding/patto', '/onboarding/identita', '/onboarding/pietra-miliare'];
return <Navigate to={routes[step] || '/onboarding/patto'} replace />;
}
return <>{children}</>;
};

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
if (!data.session) await supabase.auth.signInWithPassword({ email, password });
toast.success("Protocollo attivato.");
} else {
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
}
} catch (err: any) { toast.error(err.message); }
finally { setLoading(false); }
};
return (
<div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
<div className="w-full max-w-[350px] space-y-8 text-center">
<h1 className="text-3xl font-bold tracking-tight italic uppercase italic">Vallo!</h1>
<form onSubmit={handleAuth} className="space-y-4 text-left">
<input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-700" required />
<input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-700" required />
<button type="submit" disabled={loading} className="w-full bg-zinc-100 text-zinc-950 py-2.5 rounded-lg font-semibold text-sm hover:bg-white transition-all">{loading ? '...' : mode === 'login' ? 'Accedi' : 'Registrati'}</button>
</form>
<button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-xs text-zinc-500 hover:text-zinc-300">{mode === 'login' ? 'Crea account' : 'Accedi'}</button>
</div>
</div>
);
};

const PattoPage = () => {
const [timer, setTimer] = useState(60);
const { user } = useAuth();
const navigate = useNavigate();
useEffect(() => { if (timer > 0) { const t = setTimeout(() => setTimer(timer - 1), 1000); return () => clearTimeout(timer); } }, [timer]);
const next = async () => { await supabase.from('profiles').update({ onboarding_step: 1 }).eq('id', user?.id); navigate('/onboarding/identita'); };
return (
<div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
<div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-xl">
<h2 className="text-xl font-bold uppercase italic border-b border-zinc-800 pb-4">Il Patto</h2>
<div className="space-y-4 text-sm text-zinc-400 leading-relaxed italic">
<p><strong className="text-zinc-100">01. Silenzio:</strong> Accetti l'attesa come strumento.</p>
<p><strong className="text-zinc-100">02. Verità:</strong> Onestà brutale verso te stesso.</p>
</div>
<div className="pt-4 flex flex-col items-center">
{timer > 0 ? <div className="text-4xl font-light text-zinc-800 tabular-nums animate-pulse">{timer}s</div> : <button onClick={next} className="w-full bg-zinc-100 text-zinc-950 py-3 rounded-xl font-bold text-sm uppercase hover:bg-white transition-all">Sottoscrivo il Patto</button>}
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
if (name.trim().length < 2) return;
await supabase.from('profiles').update({ name, onboarding_step: 2 }).eq('id', user?.id);
navigate('/onboarding/pietra-miliare');
};
return (
<div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans text-center">
<form onSubmit={salva} className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-xl">
<h2 className="text-xl font-bold uppercase italic tracking-tight">Identità</h2>
<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="NOME..." className="w-full bg-transparent border-b border-zinc-800 py-3 text-center text-xl font-bold uppercase focus:border-white outline-none" autoFocus />
<button type="submit" className="w-full bg-zinc-100 text-zinc-950 py-3 rounded-xl font-bold text-sm uppercase hover:bg-white transition-all">Conferma</button>
</form>
</div>
);
};

const PietraMiliarePage = () => {
const [goal, setGoal] = useState('');
const { user } = useAuth();
const navigate = useNavigate();
const salva = async () => {
if (goal.trim().length < 10) return;
await supabase.from('profiles').update({ goal, onboarding_step: 3 }).eq('id', user?.id);
navigate('/home');
};
return (
<div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans text-center">
<div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-xl">
<h2 className="text-xl font-bold uppercase italic tracking-tight">Obiettivo</h2>
<textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="COSA VUOI DISTRUGGERE?" className="w-full h-32 bg-transparent border border-zinc-800 p-4 rounded-xl text-sm uppercase focus:border-white outline-none resize-none transition-all" />
<button onClick={salva} className="w-full bg-zinc-100 text-zinc-950 py-3 rounded-xl font-bold text-sm uppercase hover:bg-white transition-all">Attiva Vallo!</button>
</div>
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
<Route path="/onboarding/patto" element={<PattoPage />} />
<Route path="/onboarding/identita" element={<IdentitaPage />} />
<Route path="/onboarding/pietra-miliare" element={<PietraMiliarePage />} />
<Route path="/home" element={<OnboardingGuard><div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans flex flex-col justify-center items-center text-center"><h1 className="text-3xl font-black uppercase italic tracking-tighter opacity-10">Vallo!</h1><p className="text-zinc-600 text-[10px] mt-4 uppercase tracking-[0.5em] animate-pulse">In attesa del Consiglio</p></div></OnboardingGuard>} />
</Routes>
</BrowserRouter>
</AuthProvider>
);
}
