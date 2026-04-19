import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Flame, Swords, PenLine, Hammer, Target, Bell, Scale, Shield, Zap, ScrollText, Euro, Skull, Crown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ManualePage() {
  return (
    <div className="min-h-screen text-foreground" style={{ backgroundColor: '#050505' }}>
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/home" className="text-muted-foreground hover:text-foreground" aria-label="Indietro">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <Crown size={22} className="text-primary" />
            <h1 className="text-2xl font-black uppercase text-foreground tracking-tight">Il Codice del Sovrano</h1>
          </div>
        </div>

        <div className="rounded-none border-2 border-primary/40 bg-primary/5 p-5 space-y-2">
          <h2 className="text-base font-black uppercase text-primary">Cos'è Psico Vallo</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Non è un'app di supporto. È <strong className="uppercase">un'armatura</strong> e un
            <strong className="uppercase"> cruscotto del predatore</strong>: misura quanto stai
            derubando il tuo futuro, ti restituisce il conto in euro e ti consegna gli strumenti
            di ingegneria relazionale per dominare. Niente premi, niente sostegno, niente sconti.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {/* Filosofia */}
          <AccordionItem value="filosofia" className="rounded-none border-2 border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><ScrollText size={16} className="text-primary" /> La Dottrina</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p>
                Il mondo è diviso in due: chi viene programmato e chi programma. Tu, finora,
                sei stato programmato. Psico Vallo ti dà il <strong>Potere</strong> di passare
                dall'altra parte attraverso <strong>l'Ingegneria</strong> della tua mente.
              </p>
              <p>
                Niente "essere positivo", niente "credere in te stesso". Solo <strong>guardare
                in faccia la realtà</strong>, smontare le scuse e agire.
              </p>
              <p className="text-destructive font-black uppercase">
                Se cerchi conforto, sei nel posto sbagliato. Se cerchi Dominio, sei a casa.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* DEBITO E VIZI - NEW */}
          <AccordionItem value="debito" className="rounded-none border-2 border-destructive/50 bg-destructive/5 px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Euro size={16} className="text-destructive" /> La Matematica del Dolore</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong className="uppercase">Le tre leve del cruscotto:</strong></p>
              <div className="space-y-2 rounded-none border-2 border-border bg-background/40 p-3">
                <p><strong className="text-destructive">DEBITO FINANZIARIO</strong> — ogni Vizio dichiarato vale <strong className="num-brutal">+100€</strong>. Quando il debito è {'>'} 0, l'app diventa <strong>grigia</strong>. È la tua <strong className="uppercase">Paga dello Schiavo</strong>: vivi a colori solo quando sei sovrano.</p>
                <p><strong className="text-primary">LUCIDITÀ</strong> — scala 0–100. Ogni Vizio ti toglie <strong className="num-brutal">15</strong>. Ogni Azione Sovrana te ne ridà <strong className="num-brutal">2</strong>. Sotto soglia critica, sei una marionetta del tuo umore.</p>
                <p><strong className="text-primary">STREAK SOVRANA</strong> — giorni consecutivi di controllo. Un cedimento la azzera. Niente bonus a metà strada.</p>
              </div>
              <div className="rounded-none border-2 border-destructive/60 bg-background/40 p-3 space-y-2">
                <p className="text-xs font-black uppercase text-destructive">Cosa conta come VIZIO (dichiara senza pietà):</p>
                <ul className="list-disc pl-5 text-xs space-y-1 text-foreground">
                  <li><strong>Droghe</strong> — qualsiasi sostanza (cannabis, cocaina, MDMA, ketamina, psichedelici ricreativi, pasticche, oppiacei, abuso di farmaci).</li>
                  <li><strong>Alcol</strong> fuori controllo (binge, bere per fuggire, sbronza).</li>
                  <li><strong>Porno e masturbazione compulsiva</strong>, sexting di fuga, escort.</li>
                  <li><strong>Abbuffate</strong> (food binge, zucchero compulsivo, junk food per coprire emozioni).</li>
                  <li><strong>Scroll compulsivo</strong> (social, news, YouTube, reels, TikTok per ore).</li>
                  <li><strong>Gioco d'azzardo</strong>, scommesse, trading impulsivo, crypto compulsiva.</li>
                  <li><strong>Nicotina</strong> compulsiva (sigarette, vape, snus oltre il tuo limite).</li>
                  <li><strong>Procrastinazione grave</strong> su un'azione che sapevi di dover fare.</li>
                  <li><strong>Fuga relazionale</strong> (ghosting, evitamento di un confronto, bugia per quieto vivere).</li>
                  <li><strong>Esplosione emotiva</strong> incontrollata (urla, violenza verbale, autosabotaggio).</li>
                </ul>
              </div>
              <p className="text-destructive font-black uppercase">
                Regola: non mentire al sistema. Se ti dichiari sovrano mentre cedi, il sistema
                ti espelle. Qui il punteggio non è il punto. Il punto è la verità.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Consiglio */}
          <AccordionItem value="consiglio" className="rounded-none border-2 border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Shield size={16} className="text-primary" /> Il Consiglio dei 15 Maestri</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-relaxed text-foreground">
              <p>L'autorità analitica del sistema. 15 menti che lavorano come un unico organismo:</p>
              <p className="text-xs text-muted-foreground">
                Bandler, Ellis, Freud, Jung, Frankl, Erickson, Watzlawick, Cialdini, Carnegie, Aurelius,
                Peterson, Machiavelli, Socrate, Nietzsche, Carr.
              </p>
              <p>
                Parlano sempre in italiano, sempre brutalmente. Non consolano: smontano e rimontano.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Domanda */}
          <AccordionItem value="domanda" className="rounded-none border-2 border-primary/40 bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Flame size={16} className="text-primary" /> Domanda Attiva</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> forzarti a guardare un punto cieco di te stesso, una domanda alla volta.</p>
              <p><strong>Come funziona:</strong> ricevi una domanda. Devi leggerla <strong>9 volte</strong> in 9 momenti diversi (60s di osservazione). Solo dopo si sblocca la Fase B: rispondi.</p>
              <p><strong>Le regole:</strong> nella risposta sono vietate parole come "spero", "forse", "domani", "ma". Almeno 50 caratteri di verità grezza.</p>
              <p><strong>Quando usarla:</strong> ogni giorno. È il battito del sistema.</p>
            </AccordionContent>
          </AccordionItem>

          {/* SOS DNA - ULTIMA SPIAGGIA */}
          <AccordionItem value="sos" className="rounded-none border-2 border-destructive/60 bg-destructive/5 px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Skull size={16} className="text-destructive" /> SOS DNA — L'Ultima Spiaggia</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p className="text-destructive font-black uppercase">
                ⚠️ Invocare l'SOS è l'ultima spiaggia prima del crollo. Non è un gioco.
              </p>
              <p><strong>Quando attivarlo:</strong> sei sull'orlo di un cedimento serio (vizio incontrollabile, scontro che sta per esplodere, decisione che ti distruggerebbe). Non per noia.</p>
              <p><strong>Cosa succede:</strong> la navigazione viene <strong>bloccata</strong>. 3 domande secche. Due sole vie d'uscita:</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li><strong className="text-primary">RIPRENDO IL CONTROLLO</strong> — salvi l'anima e torni operativo.</li>
                <li><strong className="text-destructive">CEDO</strong> — <strong className="num-brutal">+100€</strong> al debito, lucidità a <strong className="num-brutal">0</strong>, streak azzerata, app forzatamente chiusa.</li>
              </ul>
              <p><strong>Modalità Cipolla (per scontri reali):</strong> profili il bersaglio. Il Consiglio genera i <strong>5 Veli</strong> da usare in sequenza nei 4 scenari:</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li><span className="text-amber-500 font-black">CONFLITTO</span> — guerra interpersonale</li>
                <li><span className="text-red-500 font-black">EROS & TABÙ</span> — blocchi intimi</li>
                <li><span className="text-purple-400 font-black">POWER BUSINESS</span> — negoziazioni e potere</li>
                <li><span className="text-green-500 font-black">WHATSAPP SHIELD</span> — risposte a manipolatori</li>
              </ul>
              <p className="text-destructive font-black uppercase">⚠️ NON modificare la frase. Ripetila 5 volte mentalmente. Poi lancia.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Sfogo */}
          <AccordionItem value="sfogo" className="rounded-none border-2 border-primary/40 bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><PenLine size={16} className="text-primary" /> Area Sfogo</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> hai casino in testa e devi scaricare prima di poter ragionare.</p>
              <p><strong>Come funziona:</strong> scrivi tutto, senza censure. L'AI raccoglie il fango e te lo restituisce sotto forma di domande chirurgiche, in loop. La sessione dura 30 minuti.</p>
              <p><strong>Quando usarla:</strong> pressione che sale, ansia che blocca, testa che gira a vuoto.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Forgia */}
          <AccordionItem value="forgia" className="rounded-none border-2 border-red-700/50 bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Hammer size={16} className="text-red-500" /> La Forgia</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> sfide quotidiane brutali per riprogrammare comportamenti.</p>
              <p><strong>Gatekeeper:</strong> per accedere devi prima compilare il Profilo Evolutivo (obiettivi, stile, problemi attuali, visione).</p>
              <p><strong>Come funziona:</strong> ogni giorno una sfida. La salti, perdi il ciclo. La completi, posi un mattone.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Tribunale */}
          <AccordionItem value="tribunale" className="rounded-none border-2 border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Scale size={16} className="text-foreground" /> Il Tribunale</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-relaxed text-foreground">
              <p>Cicli di valutazione di <strong>15 giorni</strong>. Il Consiglio analizza i tuoi <strong>Mattoni Posati</strong> contro le tue <strong>Crepe</strong>.</p>
              <p>Verdetto brutalista: zero sconti, zero premi di partecipazione.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Overton */}
          <AccordionItem value="overton" className="rounded-none border-2 border-amber-700/50 bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Target size={16} className="text-amber-500" /> Overton Shift</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p><strong>A cosa serve:</strong> spostare l'impossibile dentro di te. Scala in 5 step:</p>
              <ol className="list-decimal pl-5 text-xs space-y-1">
                <li><strong>IMPENSABILE</strong> — il tabù</li>
                <li><strong>RADICALE</strong> — la frattura</li>
                <li><strong>ACCETTABILE</strong> — l'azione</li>
                <li><strong>NORMA</strong> — l'abitudine</li>
                <li><strong>DOMINIO</strong> — il nuovo DNA</li>
              </ol>
              <p>Ogni step ha 48h di decadimento: non lo confermi in tempo, ricominci.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Notifiche */}
          <AccordionItem value="notifiche" className="rounded-none border-2 border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Bell size={16} className="text-primary" /> Centro Notifiche</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p>Nei <strong>Promemoria</strong> trovi ogni domanda generata. Per ognuna puoi:</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li>impostare orari fissi specifici</li>
                <li>archiviare (disattiva senza cancellare)</li>
                <li>eliminare</li>
                <li>modificare il testo</li>
              </ul>
              <p>Le push arrivano sempre, indipendentemente dalla lettura.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Quantum */}
          <AccordionItem value="quantum" className="rounded-none border-2 border-primary/40 bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Zap size={16} className="text-primary" /> Settings Quantum (Focus 12)</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-relaxed text-foreground">
              <p>Modalità sperimentale (BETA). Modellazione Olografica: 30s di stabilizzazione prima di ogni SOS DNA.</p>
              <p className="text-xs text-destructive font-black uppercase">⚠️ Non è terapia. Non sostituisce uno specialista.</p>
            </AccordionContent>
          </AccordionItem>

          {/* Flusso giornaliero */}
          <AccordionItem value="flusso" className="rounded-none border-2 border-primary/50 bg-primary/5 px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide text-primary">
              📅 Il Rituale del Sovrano
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <div>
                <p className="font-black uppercase text-primary">🌅 Mattina</p>
                <p className="text-xs">Apri la Dashboard. Guarda il debito. Apri la Domanda Attiva. Una lettura. 60s.</p>
              </div>
              <div>
                <p className="font-black uppercase text-primary">☀️ Giorno</p>
                <p className="text-xs">Le push ti colpiscono. Leggi (servono 9 letture per la Fase B). Compi Azioni Sovrane.</p>
              </div>
              <div>
                <p className="font-black uppercase text-primary">🌆 Pomeriggio (se hai casino)</p>
                <p className="text-xs">Apri l'Area Sfogo. 30 minuti di scarico.</p>
              </div>
              <div>
                <p className="font-black uppercase text-destructive">⚔️ Quando arriva l'urto</p>
                <p className="text-xs">SOS DNA. Profila. Ricevi le frecce. Ripeti 5 volte. Lancia.</p>
              </div>
              <div>
                <p className="font-black uppercase text-primary">🌙 Sera</p>
                <p className="text-xs">Rispondi alla Domanda (se Fase B sbloccata). Conta Mattoni vs Crepe.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* FAQ */}
          <AccordionItem value="faq" className="rounded-none border-2 border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">❓ Domande frequenti</AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <div>
                <p className="font-black uppercase">Perché 9 letture?</p>
                <p className="text-xs text-muted-foreground">Una domanda non si interiorizza alla prima. Serve ripetizione spaziata per scendere sotto la superficie.</p>
              </div>
              <div>
                <p className="font-black uppercase">Perché le parole bloccate?</p>
                <p className="text-xs text-muted-foreground">"Spero", "forse", "domani" sono fughe. Il sistema ti costringe al presente concreto.</p>
              </div>
              <div>
                <p className="font-black uppercase">Cos'è un Velo?</p>
                <p className="text-xs text-muted-foreground">Uno strato di difesa del bersaglio. Smontali in ordine: salti un velo, esplodi.</p>
              </div>
              <div>
                <p className="font-black uppercase">Posso modificare le frasi SOS DNA?</p>
                <p className="text-xs text-destructive font-black uppercase">No. Mai. Calibrate. Modificarle = disinnescarle.</p>
              </div>
              <div>
                <p className="font-black uppercase">Cosa succede se salto un giorno?</p>
                <p className="text-xs text-muted-foreground">Nessun premio, nessuna punizione infantile. Ma nel Tribunale conta come Crepa.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="rounded-none border-2 border-destructive/50 bg-destructive/5 p-5 space-y-2">
          <h3 className="text-sm font-black uppercase text-destructive">Le 3 Leggi del Sovrano</h3>
          <ol className="list-decimal pl-5 text-sm space-y-2 text-foreground">
            <li><strong className="uppercase">Non mentire al cruscotto.</strong> Vizi e Azioni Sovrane vanno dichiarati con verità.</li>
            <li><strong className="uppercase">Ripeti 5 volte mentalmente</strong> ogni frase del Consiglio prima di usarla.</li>
            <li><strong className="uppercase">Non saltare i Veli.</strong> L'ordine è la potenza.</li>
          </ol>
        </div>

        <Link
          to="/home"
          className="flex items-center justify-center gap-2 w-full rounded-none bg-primary py-4 text-base font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          <BookOpen size={18} /> Torna al Cruscotto
        </Link>
      </div>
    </div>
  );
}
