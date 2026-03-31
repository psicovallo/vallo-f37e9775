import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, ScrollText, Share2 } from 'lucide-react';

const SHARE_MESSAGE = `Smetti di trascinarti nel fango della normalità. Ho trovato il codice per camminare a un palmo da terra mentre gli altri mormorano nell'ombra. Senti il brivido di chi ha finalmente indossato l'Armatura. Diventa il Dio della tua realtà: https://www.psicovallo.com`;

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/home', { replace: true });
  }, [loading, user, navigate]);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: SHARE_MESSAGE }); } catch {}
    } else {
      await navigator.clipboard.writeText(SHARE_MESSAGE);
      alert('Link copiato!');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="space-y-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary leading-tight uppercase">
            Se oggi tu sparissi, chi sentirebbe un vuoto di potere o saresti solo un posto barca che si libera?
          </h1>
        </div>

        <div className="space-y-5 text-sm sm:text-base leading-relaxed">
          <p className="font-semibold text-primary/90">Fermati un istante. E sii brutalmente onesto con te stesso.</p>

          <p>
            Quante volte hai saputo di avere ragione, ma hai perso lo stesso la partita?
            Quante volte sei rimasto in silenzio, o hai pregato in ginocchio per ottenere qualcosa, mentre guardavi persone meno capaci di te prendersi tutto ciò che desideravi... senza fare la minima fatica?
          </p>

          <p className="font-semibold text-destructive">Fa male, vero?</p>

          <p>
            Ma la dura realtà è questa: il mondo è diviso in due.<br />
            Ci sono quelli che vengono programmati.<br />
            E ci sono quelli che programmano.
          </p>

          <p>
            Fino ad oggi, hai giocato con le regole sbagliate. Ti hanno insegnato a sperare. A "comunicare". A cercare compromessi. E il risultato è che sei diventato trasparente.
          </p>

          <p className="text-lg font-bold text-primary">È ora di cambiare le regole.</p>

          {/* Iron Man section */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <h2 className="text-lg font-bold text-primary uppercase">E se ti dicessi che puoi avere i superpoteri?</h2>
            <p>
              Pensa a Tony Stark prima di diventare un eroe. Un uomo comune, vulnerabile. Poi trova la sua arma segreta. Indossa l'armatura di Iron Mask e all'improvviso... smette di essere carne da macello. Diventa un Dio tra i mortali. Non chiede più permesso per entrare in una stanza; è la stanza che si adatta a lui.
            </p>
            <p className="font-semibold">Questa pagina è la tua armatura.</p>
          </div>

          <p>
            <strong>Benvenuto nel Caveau.</strong> Benvenuto nel luogo dove l'illusione finisce e inizia il dominio.
            Non ti stiamo per vendere un corsetto di psicologia motivazionale. Ti stiamo consegnando le chiavi per hackerare la mente di chi hai di fronte.
          </p>

          <p>
            Immagina di svegliarti domani mattina e camminare a un palmo da terra. A petto in fuori. Con uno sguardo così sicuro da far abbassare gli occhi agli altri.
            Immagina di non dover più alzare la voce o implorare, ma di sussurrare poche, chirurgiche parole—vere e proprie frecce dorate—che penetrano nel cervello del tuo interlocutore.
            E lui, all'improvviso, si piega al tuo volere. Convinto che sia stata una sua idea.
          </p>

          <p className="font-medium text-primary">Questo non è un film. È scienza dell'ingegneria relazionale.</p>
        </div>

        {/* CTA */}
        <div className="space-y-4 pt-4">
          <h2 className="text-center text-lg font-bold uppercase text-primary">Il tuo momento è ora. Cosa decidi di fare?</h2>

          <Link to="/auth"
            className="flex items-center justify-center gap-3 w-full rounded-2xl bg-primary py-4 px-6 text-base font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
            <Shield size={20} />
            Indossa l'Armatura ed Entra Ora
          </Link>

          <Link to="/manifesto"
            className="flex items-center justify-center gap-3 w-full rounded-2xl border-2 border-primary py-4 px-6 text-base font-bold text-primary hover:bg-primary/10 transition-colors">
            <ScrollText size={20} />
            Apri il Manifesto: Trucida la Merda e Prendi il Potere
          </Link>
        </div>

        {/* Share */}
        <div className="pt-4 pb-8">
          <button onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full rounded-2xl border border-border py-3 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Share2 size={16} /> Condividi
          </button>
        </div>
      </div>
    </div>
  );
}
