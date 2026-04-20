import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Flame, Swords, PenLine, Hammer, Target, Bell, Scale, Shield, Zap, ScrollText, Euro, Skull, Crown, Sparkles, Library } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import NecrosisDemo from '@/components/NecrosisDemo';

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
            Non è un'app di supporto. È <strong className="uppercase">Il Vallo</strong>:
            la trincea mentale tra il Sovrano e la sua natura debole. Una <strong className="uppercase">fortezza</strong>
            con cruscotto del predatore che misura quanto stai derubando il tuo futuro,
            ti restituisce il conto in euro e ti consegna gli strumenti di ingegneria relazionale per dominare.
            Niente premi, niente sostegno, niente sconti.
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
                <p><strong className="text-destructive">DEBITO DI GUERRA</strong> — ogni varco aperto ai Barbari (un Vizio dichiarato) vale <strong className="num-brutal">+100€</strong> di tributo. Quando il debito è {'>'} 0, la fortezza diventa <strong>grigia</strong>. È la tua <strong className="uppercase">Paga dello Schiavo</strong>: vivi a colori solo quando presidi le mura.</p>
                <p><strong className="text-primary">LUCIDITÀ</strong> — scala 0–100. Ogni varco ai Barbari ti toglie <strong className="num-brutal">15</strong>. Ogni azione che <strong>Rinforza le Mura</strong> te ne ridà <strong className="num-brutal">2</strong>. Sotto soglia critica, sei una marionetta del tuo umore.</p>
                <p><strong className="text-primary">STREAK SOVRANA</strong> — turni di guardia consecutivi senza brecce. Un cedimento la azzera. Niente bonus a metà strada.</p>
              </div>
              <div className="rounded-none border-2 border-destructive/60 bg-background/40 p-3 space-y-2">
                <p className="text-xs font-black uppercase text-destructive">Cosa apre un varco ai BARBARI (dichiara senza pietà):</p>
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

          {/* IL NUCLEO E LA NECROSI — DEMO INTERATTIVA */}
          <AccordionItem value="nucleo-necrosi" className="rounded-none border-2 border-amber-700/50 bg-amber-950/10 px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Sparkles size={16} className="text-amber-500" /> Il Nucleo & la Necrosi (Demo)</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <p>
                Il <strong className="text-amber-500">Nucleo della Sovranità</strong> al centro del cruscotto
                è il tuo <strong>DNA visualizzato</strong>. Non è decorazione: è il termometro vivo del tuo stato.
              </p>
              <p>
                Quando sei sovrano (debito a 0), il Nucleo è <strong className="text-amber-500">ambra brillante</strong>,
                stabile, pulsante. Quando entri in debito, inizia la <strong className="text-destructive">Necrosi Digitale</strong>:
                glitch, sfocatura, perdita di colore, frammentazione. Più aumenta il debito, più il Nucleo si corrompe.
              </p>
              <p className="text-xs text-amber-700 uppercase font-black">↓ Trascina lo slider e guarda i 5 stadi ↓</p>
              <NecrosisDemo />
            </AccordionContent>
          </AccordionItem>

          {/* GLOSSARIO BRUTALE */}
          <AccordionItem value="glossario" className="rounded-none border-2 border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2"><Library size={16} className="text-primary" /> Glossario Brutale</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <div>
                <p className="font-black uppercase text-primary">Sovrano · Sentinella del Vallo</p>
                <p className="text-xs text-muted-foreground">Chi presidia le mura, controlla i propri impulsi e dichiara la verità al cruscotto. Non chi è "perfetto", ma chi non si mente.</p>
              </div>
              <div>
                <p className="font-black uppercase text-destructive">I Barbari · L'Orda</p>
                <p className="text-xs text-muted-foreground">La tua natura animale che vuole farti restare al 10%. Si manifestano come Vizi: droga, alcol, porno, scroll, abbuffata, gioco, esplosione, procrastinazione grave. Ogni varco aperto: +100€ debito · −15 lucidità · streak azzerata.</p>
              </div>
              <div>
                <p className="font-black uppercase text-emerald-500">Rinforzare le Mura · Azione Sovrana</p>
                <p className="text-xs text-muted-foreground">Lavoro vero, allenamento, confronto difficile, disciplina mantenuta. Ricostruisce il Nucleo e paga il Debito di Guerra. +1 streak · +2 lucidità · −25€/−50€/−100€ secondo streak.</p>
              </div>
              <div>
                <p className="font-black uppercase text-amber-500">Giorno di Mura Intatte</p>
                <p className="text-xs text-muted-foreground">Dichiarazione attiva: "nelle ultime 24h non ho aperto varchi". Disponibile 1 volta ogni 24h. Vale come Rinforzo delle Mura.</p>
              </div>
              <div>
                <p className="font-black uppercase text-destructive">Tassa di Diserzione</p>
                <p className="text-xs text-muted-foreground">+50€ automatici se passi 24h senza presidiare il Vallo (nessun accesso, nessuna dichiarazione). La diserzione è debolezza.</p>
              </div>
              <div>
                <p className="font-black uppercase text-amber-500">Necrosi Digitale</p>
                <p className="text-xs text-muted-foreground">Corruzione progressiva del Nucleo (5 stadi: Stabile → Iniziale → Attiva → Grave → Terminale) all'aumentare del debito.</p>
              </div>
              <div>
                <p className="font-black uppercase text-primary">Lucidità</p>
                <p className="text-xs text-muted-foreground">Scala 0–100. Chiarezza mentale. Sotto soglia critica sei una marionetta del tuo umore.</p>
              </div>
              <div>
                <p className="font-black uppercase text-emerald-500">Streak del Turno di Guardia</p>
                <p className="text-xs text-muted-foreground">Turni consecutivi di presidio senza brecce. Moltiplica lo sconto sul Debito di Guerra. ≥7gg = −50€/azione. ≥14gg = −100€/azione.</p>
              </div>
              <div>
                <p className="font-black uppercase text-foreground">Mattone vs Crepa</p>
                <p className="text-xs text-muted-foreground">Mattone = pietra che rinforza il Vallo. Crepa = breccia o turno saltato. Il Tribunale li conta ogni 15 giorni.</p>
              </div>
              <div>
                <p className="font-black uppercase text-primary">Velo</p>
                <p className="text-xs text-muted-foreground">Strato di difesa di un bersaglio in SOS DNA. 5 Veli per profilo. Vanno usati in ordine, mai saltati.</p>
              </div>
              <div>
                <p className="font-black uppercase text-amber-500">Pietra Zero</p>
                <p className="text-xs text-muted-foreground">La verità grezza che hai inciso nell'onboarding. Il motivo per cui sei qui. Non si modifica a cuor leggero.</p>
              </div>
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
              <p><strong>Come funziona:</strong> scrivi tutto, senza censure. Il Consiglio dei Maestri raccoglie il fango e te lo restituisce sotto forma di domande chirurgiche, in loop. La sessione dura 30 minuti.</p>
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
              📅 Il Turno di Guardia del Sovrano
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-foreground">
              <div>
                <p className="font-black uppercase text-primary">🌅 Mattina · Cambio della guardia</p>
                <p className="text-xs">Sali sulle mura. Apri la Dashboard. Guarda il Debito di Guerra. Apri la Domanda Attiva. Una lettura. 60s.</p>
              </div>
              <div>
                <p className="font-black uppercase text-primary">☀️ Giorno · Presidio attivo</p>
                <p className="text-xs">I corni di guardia ti chiamano. Leggi (servono 9 letture per la Fase B). Rinforza le Mura.</p>
              </div>
              <div>
                <p className="font-black uppercase text-primary">🌆 Pomeriggio (se hai casino in testa)</p>
                <p className="text-xs">Apri l'Area Sfogo. 30 minuti di scarico per non aprire varchi.</p>
              </div>
              <div>
                <p className="font-black uppercase text-destructive">⚔️ Quando l'Orda preme alle porte</p>
                <p className="text-xs">SOS DNA. Profila. Ricevi le frecce. Ripeti 5 volte. Lancia.</p>
              </div>
              <div>
                <p className="font-black uppercase text-primary">🌙 Sera · Rapporto al Consiglio</p>
                <p className="text-xs">Rispondi alla Domanda (se Fase B sbloccata). Conta Mattoni vs Crepe.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* FAQ SUDDITI SMARRITI */}
          <AccordionItem value="faq-sudditi" className="rounded-none border-2 border-amber-700/50 bg-amber-950/10 px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">
              <div className="flex items-center gap-2">
                <Skull size={16} className="text-amber-500" />
                Domande Frequenti per Sudditi Smarriti
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 text-sm leading-relaxed text-foreground">
              <div>
                <p className="font-black uppercase text-amber-500">Perché il Nucleo è grigio e glitchato?</p>
                <p className="text-xs text-foreground mt-1">
                  Perché hai <strong>aperto varchi nelle mura</strong>. Ogni Barbaro che entra corrompe il DNA visualizzato.
                  <strong> Rinforza le Mura</strong> (Azioni Sovrane, Giorni di Mura Intatte) per riportarlo allo stato ambra brillante.
                </p>
              </div>
              <div>
                <p className="font-black uppercase text-amber-500">Cosa succede se salto il Turno di Guardia?</p>
                <p className="text-xs text-foreground mt-1">
                  <strong>Il silenzio è diserzione.</strong> Se passano 24h senza che tu presidi il Vallo,
                  paghi automaticamente <strong className="text-destructive">+50€ di Tassa di Diserzione</strong>.
                  Lasciare le mura sguarnite costa quanto un mezzo cedimento.
                </p>
              </div>
              <div>
                <p className="font-black uppercase text-amber-500">Come cancello il Debito di Guerra?</p>
                <p className="text-xs text-foreground mt-1">
                  Solo <strong>Rinforzando le Mura</strong> (Azioni Sovrane e Giorni di Mura Intatte). Il lavoro è
                  l'unica moneta accettata qui. Sconto base: <strong>−25€</strong>. Con streak ≥ 7gg:
                  <strong> −50€</strong>. Con streak ≥ 14gg: <strong>−100€</strong> (un'azione cancella un cedimento intero).
                </p>
              </div>
              <div>
                <p className="font-black uppercase text-amber-500">Cos'è un Giorno di Mura Intatte e quando lo dichiaro?</p>
                <p className="text-xs text-foreground mt-1">
                  È la dichiarazione che <strong>nelle ultime 24h non hai aperto varchi ai Barbari</strong>.
                  Resistere è un atto attivo, non un'assenza. Disponibile <strong>una volta ogni 24h</strong>.
                  Rinforza le Mura: +1 streak, +2 lucidità, paga il Debito di Guerra.
                </p>
              </div>
              <div>
                <p className="font-black uppercase text-amber-500">Devo per forza erigere il Vallo sul telefono?</p>
                <p className="text-xs text-foreground mt-1">
                  Sì. Senza il Vallo eretto sul dispositivo, i corni di guardia non ti raggiungono in modo affidabile.
                  Sei un passante nel deserto, non una sentinella. Vai nelle istruzioni di installazione (Onboarding o Profilo).
                </p>
              </div>
              <div>
                <p className="font-black uppercase text-amber-500">Posso "imbrogliare" il sistema?</p>
                <p className="text-xs text-destructive font-black uppercase mt-1">
                  Puoi. E ti stai derubando da solo. Il punteggio non serve a noi. Serve a te.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* FAQ */}
          <AccordionItem value="faq" className="rounded-none border-2 border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-black uppercase tracking-wide">❓ Domande frequenti (Tecniche)</AccordionTrigger>
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
