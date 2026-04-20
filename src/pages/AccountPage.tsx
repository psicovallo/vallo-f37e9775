import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import PhoneVerifyForm from '@/components/PhoneVerifyForm';
import { Mail, Phone, KeyRound, ShieldCheck, Loader2, Pencil, X, Check, LogIn } from 'lucide-react';
import { toast } from 'sonner';

type LinkedProvider = { provider: string; providerLabel: string };

export default function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [waEnabled, setWaEnabled] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [editPhone, setEditPhone] = useState(false);

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [providers, setProviders] = useState<LinkedProvider[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setNewEmail(user.email ?? '');
    // Provider OAuth collegati (da identities)
    const ids = (user.identities ?? []).map((i: any) => ({
      provider: i.provider as string,
      providerLabel: (i.provider as string).charAt(0).toUpperCase() + (i.provider as string).slice(1),
    }));
    setProviders(ids);
    supabase
      .from('profiles')
      .select('phone_number, wa_notifications_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfilePhone((data as any).phone_number ?? null);
          setWaEnabled(!!(data as any).wa_notifications_enabled);
        }
      });
  }, [user]);

  const saveEmail = async () => {
    if (!newEmail || newEmail === user?.email) {
      setEditEmail(false);
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success('Email di conferma inviata. Controlla entrambe le caselle (vecchia e nuova).');
      setEditEmail(false);
    } catch (err: any) {
      toast.error(err?.message || 'Aggiornamento email fallito');
    } finally {
      setSavingEmail(false);
    }
  };

  const changePassword = async () => {
    if (newPwd.length < 6) {
      toast.error('La nuova password deve avere almeno 6 caratteri.');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('Le password non coincidono.');
      return;
    }
    if (!user?.email) {
      toast.error('Email non disponibile.');
      return;
    }
    setSavingPwd(true);
    try {
      // Riautentica con la password attuale
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPwd,
      });
      if (signInErr) {
        toast.error('Password attuale errata.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success('Password aggiornata.');
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      toast.error(err?.message || 'Aggiornamento password fallito');
    } finally {
      setSavingPwd(false);
    }
  };

  const linkGoogle = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin + '/account',
      });
      if ((result as any).error) {
        toast.error('Collegamento Google fallito');
      }
    } catch {
      toast.error('Collegamento Google fallito');
    }
  };

  const onPhoneVerified = async (clean: string) => {
    setProfilePhone(clean);
    setWaEnabled(true);
    setEditPhone(false);
  };

  const toggleWa = async (next: boolean) => {
    if (!user) return;
    setWaEnabled(next);
    await supabase
      .from('profiles')
      .update({ wa_notifications_enabled: next } as any)
      .eq('user_id', user.id);
    toast.success(next ? 'Corni di Guardia via WhatsApp attivi.' : 'Corni di Guardia via WhatsApp disattivati.');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasGoogle = providers.some((p) => p.provider === 'google');
  const hasApple = providers.some((p) => p.provider === 'apple');

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Account</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci email, numero di telefono e metodi di accesso al Vallo.
          </p>
        </header>

        {/* EMAIL */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Email</h2>
          </div>
          {!editEmail ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-foreground break-all">{user.email}</p>
              <button
                onClick={() => setEditEmail(true)}
                className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                <Pencil size={12} /> Cambia
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="nuova@email.com"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Riceverai un link di conferma sulla nuova email. Il cambio diventa effettivo solo dopo la conferma.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={saveEmail}
                  disabled={savingEmail}
                  className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {savingEmail ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Conferma
                </button>
                <button
                  onClick={() => { setEditEmail(false); setNewEmail(user.email ?? ''); }}
                  className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* TELEFONO */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Numero di telefono (WhatsApp)</h2>
          </div>
          {!editPhone ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  {profilePhone ? (
                    <p className="text-sm font-mono text-foreground">+{profilePhone}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessun numero verificato.</p>
                  )}
                  {profilePhone && (
                    <p className="text-[10px] text-emerald-500 flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={10} /> Verificato
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setEditPhone(true)}
                  className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  <Pencil size={12} /> {profilePhone ? 'Cambia' : 'Aggiungi'}
                </button>
              </div>

              {profilePhone && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
                  <span className="text-xs text-foreground">Corni di Guardia via WhatsApp</span>
                  <button
                    onClick={() => toggleWa(!waEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${waEnabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${waEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <PhoneVerifyForm
                userId={user.id}
                initialPhone={profilePhone ?? ''}
                submitLabel="Verifica e salva numero"
                onVerified={onPhoneVerified}
              />
              <button
                onClick={() => setEditPhone(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Annulla
              </button>
            </div>
          )}
        </section>

        {/* PASSWORD */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Cambia password</h2>
          </div>
          <div className="space-y-2">
            <input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="Password attuale"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Nuova password (min 6 caratteri)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Conferma nuova password"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={changePassword}
              disabled={savingPwd || !oldPwd || !newPwd}
              className="w-full flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {savingPwd ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aggiorna password
            </button>
          </div>
        </section>

        {/* METODI DI ACCESSO */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <LogIn size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Metodi di accesso</h2>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
            <div>
              <p className="text-sm text-foreground">Email + Password</p>
              <p className="text-[10px] text-muted-foreground">Sempre attivo</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">ATTIVO</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
            <div>
              <p className="text-sm text-foreground">Google</p>
              <p className="text-[10px] text-muted-foreground">
                {hasGoogle ? 'Account collegato' : 'Collega per accedere con Google'}
              </p>
            </div>
            {hasGoogle ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">COLLEGATO</span>
            ) : (
              <button
                onClick={linkGoogle}
                className="rounded-xl border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                Collega
              </button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 opacity-60">
            <div>
              <p className="text-sm text-foreground">Apple</p>
              <p className="text-[10px] text-muted-foreground">
                {hasApple ? 'Account collegato' : 'Non ancora abilitato'}
              </p>
            </div>
            {hasApple && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">COLLEGATO</span>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
            Per scollegare un metodo OAuth, contatta il supporto. Email e password restano sempre attive come fallback.
          </p>
        </section>
      </div>
    </div>
  );
}
