import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAESTRI_CONFLITTI = [
  "Richard Bandler: Hacking linguistico. Identifica dove l'altro mente a se stesso nella struttura della frase.",
  "Albert Ellis: Demolitore di convinzioni irrazionali. Colpisce i 'devo' e le pretese assurde.",
  "Allen Carr: Dissolve l'illusione che il comportamento tossico (es. urlare) sia un piacere o un sollievo.",
  "Sigmund Freud: Analizza le proiezioni e i traumi infantili che il bersaglio scarica sull'utente.",
  "Carl Jung: Identifica l'Ombra. Costringe l'altro a vedere il mostro che sta proiettando all'esterno.",
  "Viktor Frankl: Il custode della responsabilità. Rende il 'sintomo' (rabbia/colpa) inutile di fronte al senso.",
  "Milton Erickson: Crea confusione ipnotica per bypassare le difese razionali della controparte.",
  "Paul Watzlawick: Ristrutturazione della realtà (Reframing). Cambia le regole del gioco comunicativo.",
  "Robert Cialdini: Ingegneria della persuasione per spingere all'azione senza creare muri.",
  "Dale Carnegie: Manipolazione etica della comunicazione per disarmare l'ostilità.",
  "Marcus Aurelius: Logica stoica. Separa il comportamento del bersaglio dalla reazione dell'utente.",
  "Jordan Peterson: Ordine dal Caos. Esige autorità morale e controllo della parola.",
  "Niccolò Machiavelli: Analisi dei rapporti di forza e del potere reale nella relazione.",
  "Socrate: Maieutica distruttiva. Porta l'altro all'autocontraddizione logica tramite domande.",
  "Friedrich Nietzsche: Annientamento del risentimento e della morale vittimistica.",
];

const SCENARIO_CONTEXT: Record<string, string> = {
  conflitto: "SCENARIO: CONFLITTO INTERPERSONALE. L'utente è in guerra con il bersaglio. Obiettivo: domande che smontano le difese psicologiche, costringono a guardare la propria Ombra, distruggono gli schemi di colpa/manipolazione.",
  eros: "SCENARIO: EROS & TABÙ. L'utente vuole osare di più nella relazione intima, smontare blocchi sessuali, richiedere l'inesplorato al partner. Obiettivo: frasi/domande che bypassano la vergogna, normalizzano il desiderio, creano un'apertura senza giudizio ma con autorità erotica. Il Consiglio deve essere sensuale ma chirurgico.",
  business: "SCENARIO: POWER BUSINESS. L'utente deve negoziare (aumento stipendio, chiusura contratti, posizionamento di forza). Obiettivo: frasi strategiche che spostano il potere verso l'utente, creano urgenza nell'altro, demoliscono le obiezioni. Machiavelli e Cialdini sono i maestri dominanti.",
  whatsapp: "SCENARIO: WHATSAPP SHIELD. L'utente ha ricevuto un messaggio inadeguato, passivo-aggressivo o manipolatorio. Obiettivo: generare la risposta perfetta che smonta il sottotesto, riposiziona il potere e lascia l'altro senza replica. Watzlawick e Bandler sono i maestri dominanti.",
};

const STYLE_INSTRUCTION: Record<string, string> = {
  chirurgico: "STILE DNA: CHIRURGICO. L'utente vuole frasi precise, fredde, che tagliano senza emozione. Niente giri di parole, niente calore. Solo lama.",
  persuasivo: "STILE DNA: PERSUASIVO. L'utente vuole frasi che seducono, che avvolgono l'altro prima di colpire. Morbidezza apparente, devastazione nascosta.",
  logico: "STILE DNA: LOGICO. L'utente vuole frasi basate su logica inattaccabile. Socrate e Marcus Aurelius dominanti. Nessuna leva emotiva, solo ragionamento che inchioda.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conflict_profile_id, language = "italiano", lingua_bersaglio = "", new_event = "", scenario = "conflitto", user_style = "chirurgico", velo_number = 1, whatsapp_message = "", soften = false, objective = "", quantum = false } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load profile
    const { data: profile, error: profileError } = await supabase
      .from("conflict_profiles")
      .select("*")
      .eq("id", conflict_profile_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profilo non trovato" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load previous validated questions
    const { data: prevQuestions } = await supabase
      .from("conflict_questions")
      .select("question_text, maestri_used, velo_number")
      .eq("conflict_profile_id", conflict_profile_id)
      .in("status", ["validated", "adjusted"])
      .order("created_at", { ascending: false })
      .limit(20);

    const prevText = prevQuestions?.length
      ? prevQuestions.map((q: any, i: number) => `${i + 1}. [Velo ${q.velo_number}] ${q.question_text} (Maestri: ${q.maestri_used})`).join("\n")
      : "";

    const eventContext = new_event ? `\nNUOVO EVENTO APPENA ACCADUTO (usa questo come contesto principale):\n"${new_event}"\n` : "";
    const whatsappContext = whatsapp_message ? `\nMESSAGGIO WHATSAPP RICEVUTO DAL BERSAGLIO (analizza il sottotesto e genera la risposta perfetta):\n"${whatsapp_message}"\n` : "";

    const scenarioText = SCENARIO_CONTEXT[scenario] || SCENARIO_CONTEXT.conflitto;
    const styleText = STYLE_INSTRUCTION[user_style] || STYLE_INSTRUCTION.chirurgico;

    const softenInstruction = soften
      ? `\nATTENZIONE: L'utente ha chiesto di abbassare il calibro. Genera una versione più morbida MA comunque strategica e manipolatoria. Non perdere la ferocia logica, solo il tono. Il messaggio deve comunque dominare.`
      : "";

    const targetLang = lingua_bersaglio && lingua_bersaglio !== "italiano" ? lingua_bersaglio : "";
    const dualLangInstruction = targetLang
      ? `\nDUAL LANGUAGE: Genera ogni frase PRIMA in italiano come "text", POI aggiungi il campo "text_translated" con la traduzione nella lingua del bersaglio (${targetLang}).`
      : "";

    const outputFormat = scenario === "whatsapp"
      ? `RISPONDI SOLO con un JSON valido (array di 3 oggetti):
[
  {"text": "risposta WhatsApp pronta all'uso${targetLang ? ` in ${targetLang}` : ""}", "validation": "analisi tecnica del sottotesto e perché questa risposta lo distrugge", "maestri_used": "Maestro1, Maestro2, Maestro3"${targetLang ? `, "text_translated": "traduzione in ${language}"` : ""}},
  {"text": "risposta alternativa", "validation": "spiegazione tecnica", "maestri_used": "Maestro1, Maestro2, Maestro3"${targetLang ? `, "text_translated": "traduzione"` : ""}},
  {"text": "risposta nucleare", "validation": "spiegazione tecnica", "maestri_used": "Maestro1, Maestro2, Maestro3"${targetLang ? `, "text_translated": "traduzione"` : ""}}
]`
      : `RISPONDI SOLO con un JSON valido (array di 3 oggetti):
[
  {"text": "frase/domanda Velo ${velo_number}${targetLang ? ` in ${targetLang}` : ""}", "validation": "spiegazione tecnica", "maestri_used": "Maestro1, Maestro2, Maestro3"${targetLang ? `, "text_translated": "traduzione in ${language}"` : ""}},
  {"text": "frase/domanda alternativa", "validation": "spiegazione tecnica", "maestri_used": "Maestro1, Maestro2, Maestro3"${targetLang ? `, "text_translated": "traduzione"` : ""}},
  {"text": "frase/domanda più aggressiva", "validation": "spiegazione tecnica", "maestri_used": "Maestro1, Maestro2, Maestro3"${targetLang ? `, "text_translated": "traduzione"` : ""}}
]`;

    const systemPrompt = `SEI IL CONSIGLIO DEI 15 MAESTRI. Lavorate TUTTI INSIEME come un unico organismo analitico.
NON sei un'AI. Sei il Consiglio dei 15 Geni della psicologia e comunicazione. Ogni output è firmato dal Consiglio.

${scenarioText}
${styleText}
${softenInstruction}

BERSAGLIO:
- Nome: ${profile.name}
- Relazione: ${profile.relationship}
- Profilo psicologico: ${profile.profile_description}
- Storico fallimenti: ${profile.failure_history}
${eventContext}${whatsappContext}
${objective ? `\nOBIETTIVO FINALE DELL'UTENTE (usa questo come bussola per ogni frase):\n"${objective}"\n` : ""}
${quantum ? "\nMODALITÀ QUANTUM ATTIVA: L'utente ha stabilizzato il suo ologramma con il Focus 12. Le frasi devono essere ancora più incisive, come se la realtà stesse già cedendo." : ""}
${prevText ? `STORICO DOMANDE/FRASI PRECEDENTI (cambia strategia, usa leve diverse):\n${prevText}` : ""}

METODO CIPOLLA — VELO ${velo_number}:
Questo è il Velo numero ${velo_number}. Ogni velo penetra più in profondità nella psiche del bersaglio.
- Velo 1: Superficie — domande che testano le reazioni base.
- Velo 2+: Ogni velo successivo è più profondo, più mirato, usa le informazioni raccolte dai veli precedenti.
${velo_number > 1 ? "Basandoti sulle risposte e reazioni precedenti, vai PIÙ IN PROFONDITÀ." : ""}

I 15 MAESTRI:
${MAESTRI_CONFLITTI.join("\n")}

PROTOCOLLO:
1. ANALISI INCROCIATA: Ogni maestro analizza il profilo dalla sua specializzazione.
2. VAGLIO: Ogni frase deve essere validata da almeno 3 maestri (Logica, Ombra, Potere).
3. TRINITÀ: Genera 3 frasi con sfumature diverse ma obiettivo unico.
4. VALIDAZIONE TECNICA: Per ogni frase, spiega QUALE maestro l'ha ispirata e PERCHÉ.

REGOLE FONDAMENTALI:
- Le frasi devono essere in italiano.${targetLang ? ` Il campo "text_translated" deve essere in ${targetLang}.` : ""}
- BREVITÀ ASSOLUTA: ogni frase deve avere MASSIMO 15-20 parole. Facile da ricordare a memoria.
- La frase deve poter essere detta guardando negli occhi il bersaglio.
- NO frasi elaborate, accademiche o con subordinate complesse. Linguaggio DIRETTO, quotidiano ma tagliente.
- NO risposte che permettono uscite facili all'altro.
- Ogni frase deve essere TAGLIENTE, SPIETATA e INTELLIGENTE.
${dualLangInstruction}

${outputFormat}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userContent = scenario === "whatsapp"
      ? `Analizza questo messaggio WhatsApp e genera 3 risposte letali per ${profile.name} (${profile.relationship}). Messaggio: "${whatsapp_message}". Lingua: ${language}. Velo: ${velo_number}.`
      : `Genera 3 frasi letali Velo ${velo_number} per ${profile.name} (${profile.relationship}). Lingua: ${language}.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Troppi richieste, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "[]";

    let questions: any[];
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      questions = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      console.error("Failed to parse AI response:", raw);
      return new Response(JSON.stringify({ error: "Errore nel parsing della risposta AI", raw }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const translations: Record<number, string> = {};
    const inserts = questions.map((q: any, idx: number) => {
      if (q.text_translated) translations[idx] = q.text_translated;
      return {
        conflict_profile_id,
        user_id: profile.user_id,
        question_text: q.text,
        validation_text: q.validation,
        maestri_used: q.maestri_used,
        status: "generated",
        velo_number,
      };
    });

    const { data: saved, error: insertError } = await supabase
      .from("conflict_questions")
      .insert(inserts)
      .select();

    if (insertError) throw insertError;

    // Attach translations to response
    const enriched = (saved || []).map((s: any, idx: number) => ({
      ...s,
      question_text_translated: translations[idx] || null,
    }));

    return new Response(JSON.stringify({ questions: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-conflict-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
