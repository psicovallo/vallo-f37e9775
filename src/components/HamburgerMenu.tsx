import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Menu, X, User, Zap, Bell, BookOpen, LogOut, Globe, Save, Shield, ScrollText, Share2, MessageSquare, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const SHARE_MESSAGE = `Smetti di trascinarti nel fango della normalità. Ho trovato il codice per camminare a un palmo da terra mentre gli altri mormorano nell'ombra. Senti il brivido di chi ha finalmente indossato l'Armatura. Diventa il Dio della tua realtà: https://www.psicovallo.com`;

export default function HamburgerMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQuantum, setShowQuantum] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [quantumEnabled, setQuantumEnabled] = useState(false);
  const [quantumModal, setQuantumModal] = useState(false);
  const [linguaMadre, setLinguaMadre] = useState('italiano');
  const [userName, setUserName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: SHARE_MESSAGE }); } catch {}
    } else {
      await navigator.clipboard.writeText(SHARE_MESSAGE);
      toast.success('Link copiato!');
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('name, lingua_madre, quantum_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserName((data as any).name || '');
          setLinguaMadre((data as any).lingua_madre || 'italiano');
          setQuantumEnabled((data as any).quantum_enabled || false);
        }
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({
      name: userName,
      lingua_madre: linguaMadre,
    } as any).eq('user_id', user.id);
    toast.success('Profilo aggiornato');
    setSaving(false);
  };

  const toggleQuantum = async () => {
    if (!quantumEnabled) {
      setQuantumModal(true);
    } else {
      await supabase.from('profiles').update({ quantum_enabled: false } as any).eq('user_id', user!.id);
      setQuantumEnabled(false);
      toast.success('Quantum disattivato');
    }
  };

  const confirmQuantum = async () => {
    await supabase.from('profiles').update({ quantum_enabled: true } as any).eq('user_id', user!.id);
    setQuantumEnabled(true);
    setQuantumModal(false);
    toast.success('Quantum attivato');
  };

  const LANGUAGES = [
    'italiano', 'english', 'español', 'français', 'deutsch', 'português',
    'العربية', '中文', '日本語', 'русский', 'हिन्दी',
  ];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
        <Menu size={22} />
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { setOpen(false); setShowProfile(false); setShowQuantum(false); setShowManual(false); }} />

      {/* Panel */}
      <div className="fixed top-0 left-0 bottom-0 z-[70] w-[75vw] max-w-72 bg-card border-r border-border flex flex-col animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-foreground">Menu</h2>
          <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <Link to="/profile" onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors">
            <User size={18} /> Il Mio Profilo Evolutivo
          </Link>
          <button onClick={() => { setShowQuantum(true); setShowProfile(false); setShowManual(false); }}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors">
            <Zap size={18} className={quantumEnabled ? 'text-primary' : ''} /> Settings Quantum
            {quantumEnabled && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">ON</span>}
          </button>
          <Link to="/reminders" onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors">
            <Bell size={18} /> Neural Reminders
          </Link>
          <Link to="/manuale" onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors">
            <BookOpen size={18} /> Manuale Operativo
          </Link>
          <button onClick={async () => {
            if (!user) return;
            await supabase.from('profiles').update({ tour_completed: false } as any).eq('user_id', user.id);
            toast.success('Tour resettato. Torna alla Home per rifarlo.');
            setOpen(false);
          }}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors">
            <Compass size={18} /> Rifai il Tour Guidato
          </button>
          <div className="my-2 border-t border-border" />
          <Link to="/landing" onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors">
            <Shield size={18} /> L'Armatura
          </Link>
          <Link to="/manifesto" onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors">
            <ScrollText size={18} /> Il Manifesto
          </Link>
          <div className="my-2 border-t border-border" />
          <button onClick={() => { setOpen(false); handleShare(); }}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-foreground hover:bg-muted transition-colors">
            <Share2 size={18} /> Condividi l'Armatura
          </button>
        </div>

        <div className="p-4 border-t border-border">
          <button onClick={() => { signOut(); setOpen(false); }}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut size={18} /> Esci
          </button>
        </div>
      </div>

      {/* Sub-panels */}
      {showProfile && (
        <div className="fixed inset-0 z-[75] bg-background overflow-y-auto animate-in slide-in-from-right duration-150">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Il Mio Profilo</h3>
            <button onClick={() => setShowProfile(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Nome</label>
              <input value={userName} onChange={e => setUserName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
              <p className="text-sm text-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1">
                <Globe size={14} /> Lingua Madre
              </label>
              <select value={linguaMadre} onChange={e => setLinguaMadre(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                Il Consiglio comunicherà con te esclusivamente in questa lingua per colpire direttamente il tuo nucleo emotivo e istintivo, dove non esistono lacune interpretative.
              </p>
            </div>
            <button onClick={saveProfile} disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva Profilo'}
            </button>
          </div>
        </div>
      )}

      {showQuantum && (
        <div className="fixed inset-0 z-[75] bg-background overflow-y-auto animate-in slide-in-from-right duration-150">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Settings Quantum</h3>
            <button onClick={() => setShowQuantum(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={18} className={quantumEnabled ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-sm font-medium text-foreground">Modellazione Olografica</span>
              </div>
              <button onClick={toggleQuantum}
                className={`relative w-12 h-6 rounded-full transition-colors ${quantumEnabled ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${quantumEnabled ? 'left-[26px]' : 'left-0.5'}`} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Attiva la Modellazione Olografica e il Protocollo Gateway (Focus 12).
            </p>
            {quantumEnabled && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-primary font-medium">✓ Focus 12 attivo — Il timer di stabilizzazione apparirà prima di ogni sessione SOS DNA.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showManual && (
        <div className="fixed inset-0 z-[75] bg-background overflow-y-auto animate-in slide-in-from-right duration-150">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Manuale Operativo</h3>
            <button onClick={() => setShowManual(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
              <h4 className="text-sm font-bold text-primary">Chi siamo: Il Consiglio dei 15</h4>
              <p className="text-xs text-foreground leading-relaxed">
                15 geni della psicologia, persuasione e comunicazione strategica. Bandler, Ellis, Freud, Jung, Frankl, 
                Erickson, Watzlawick, Cialdini, Carnegie, Aurelius, Peterson, Machiavelli, Socrate, Nietzsche e Carr. 
                Lavorano come un unico organismo analitico al tuo servizio.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <h4 className="text-sm font-bold text-foreground">Perché la Cipolla</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                La verità e il risultato sono sotto strati di bugie sociali. Ogni "Velo" penetra più in profondità 
                nella psiche del bersaglio. Non puoi saltare i veli. Il crollo avviene quando tutti gli strati sono dissolti.
              </p>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <h4 className="text-sm font-bold text-destructive">La Regola d'Oro</h4>
              <p className="text-xs text-foreground leading-relaxed font-medium">
                Se modifichi la frase, l'arma esplode nelle tue mani. Fidati dei Maestri. 
                Ripeti la frase 5 volte nella tua mente prima di usarla. Poi aspetta la reazione.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <h4 className="text-sm font-bold text-foreground">DNA — Decoding & Neural Adaptation</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                La comunicazione è lo specchio del tuo DNA. Se vuoi passare dalla reazione alla creazione olografica, 
                vai nel Menu Hamburger → Settings e attiva la Modalità Quantum.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quantum activation modal */}
      {quantumModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-primary" />
              <h3 className="font-bold text-foreground">Attivazione Focus 12</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              Il Focus 12 è una tecnologia della coscienza che permette alla mente di modellare la realtà prima che si manifesti nello spazio-tempo.
            </p>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs text-destructive font-medium leading-relaxed">
                DISCLAIMER BETA: SOS DNA Quantum è in fase sperimentale. L'uso di queste tecniche è a tuo rischio. 
                Non siamo medici né psicologi. Queste tecniche non sostituiscono trattamenti professionali. 
                Se soffri di patologie psichiche, consulta uno specialista prima di procedere.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmQuantum}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Accetto e Attivo
              </button>
              <button onClick={() => setQuantumModal(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
