import { Bell, Clock, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContractPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-24 pt-8">
      <div className="mb-8 text-center">
        <Flame size={48} className="mx-auto mb-4 text-primary" />
        <h1 className="mb-2 text-2xl font-bold text-foreground">Il tuo Contratto</h1>
        <p className="text-sm text-muted-foreground">Questo è l'accordo che hai accettato.</p>
      </div>

      <div className="flex-1 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Bell size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">6 notifiche al giorno</p>
              <p className="mt-1 text-xs text-muted-foreground">
                La stessa domanda torna nei 6 slot casuali della tua fascia oraria finché non la completi davvero.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Clock size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Fase Osservazione</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ogni domanda va guardata per 15 secondi almeno 9 volte. Se salti una lettura, il sistema continua a riproportela.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Flame size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">10ª apertura = risposta</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Alla 10ª apertura si sblocca 1 minuto di attesa, poi minimo 50 caratteri e infine scegli il bottone emotivo.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-center text-sm font-medium text-foreground">
            "Se il cibo è il tuo carceriere, queste domande sono la chiave. Ma la chiave brucia."
          </p>
        </div>
      </div>

      <Link
        to="/home"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Torna alla Home
      </Link>
    </div>
  );
}
