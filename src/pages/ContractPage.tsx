import { Flame, Clock, Bell, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContractPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <div className="mb-8 text-center">
        <Flame size={48} className="mx-auto mb-4 text-primary" />
        <h1 className="mb-2 text-2xl font-bold text-foreground">Il Patto</h1>
        <p className="text-sm text-muted-foreground">Questo è il contratto che hai accettato.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-foreground leading-relaxed">
            Questo non è un'app motivazionale. Non ci sono premi, badge, stelline o complimenti.
            Questo è uno specchio. E gli specchi non mentono.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Bell size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">6 notifiche al giorno</p>
              <p className="mt-1 text-xs text-muted-foreground">
                La stessa domanda tornerà finché non l'hai attraversata. Non puoi saltarla.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Clock size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">9 osservazioni obbligatorie</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ogni domanda deve essere vista almeno 9 volte (max 2 al giorno). Un timer random tra 7 e 17 secondi verifica la tua presenza.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Flame size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sblocco risposta imprevedibile</p>
              <p className="mt-1 text-xs text-muted-foreground">
                La fase risposta può scattare in qualsiasi momento durante le 9 osservazioni. Quando succede: 60 secondi di attesa, minimo 50 caratteri, zero scuse.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Filtro anti-scuse</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Parole come "domani", "spero", "difficile", "ma", "forse", "proverò" vengono bloccate. Se provi a scappare, il timer si resetta.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Link
        to="/home"
        className="mt-8 flex w-full items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary active:scale-[0.97]"
      >
        Torna alla Home
      </Link>
    </div>
  );
}
