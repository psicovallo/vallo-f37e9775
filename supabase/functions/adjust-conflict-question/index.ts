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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question_id, adjustment_notes, language = "italiano" } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load the question
    const { data: question, error: qError } = await supabase
      .from("conflict_questions")
      .select("*, conflict_profiles(*)")
      .eq("id", question_id)
      .single();

    if (qError || !question) {
      return new Response(JSON.stringify({ error: "Domanda non trovata" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = question.conflict_profiles;

    const systemPrompt = `SEI IL CONSIGLIO DEI 15 MAESTRI. L'utente ha ricevuto una domanda ma non è soddisfatto e chiede un aggiustamento.

DOMANDA ORIGINALE: "${question.question_text}"
VALIDAZIONE ORIGINALE: "${question.validation_text}"
MAESTRI USATI: ${question.maestri_used}

FEEDBACK DELL'UTENTE: "${adjustment_notes}"

BERSAGLIO:
- Nome: ${profile.name}
- Relazione: ${profile.relationship}
- Profilo psicologico: ${profile.profile_description}
- Storico fallimenti: ${profile.failure_history}

I 15 MAESTRI:
${MAESTRI_CONFLITTI.join("\n")}

COMPITO: Riformula la domanda tenendo conto del feedback dell'utente. La domanda DEVE passare dal vaglio del Consiglio.

REGOLE FONDAMENTALI:
- La domanda deve essere BREVE: massimo 15-20 parole. Deve essere facile da ricordare a memoria.
- Deve essere una domanda che l'utente può fare guardando negli occhi il bersaglio, senza leggere.
- NO frasi elaborate o accademiche. Linguaggio diretto, quotidiano ma tagliente.
- La domanda deve essere in ${language}.
- Mantieni la ferocia e la precisione psicologica ma in forma CONCISA.

RISPONDI SOLO con un JSON valido:
{"text": "domanda riformulata breve", "validation": "spiegazione tecnica breve", "maestri_used": "Maestro1, Maestro2, Maestro3"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
          { role: "user", content: `Riformula la domanda seguendo il feedback. Lingua: ${language}.` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Troppi richieste, riprova tra poco." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";

    let result: any;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return new Response(JSON.stringify({ error: "Errore nel parsing della risposta AI", raw }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the question in DB
    const { data: updated, error: updateError } = await supabase
      .from("conflict_questions")
      .update({
        question_text: result.text,
        validation_text: result.validation,
        maestri_used: result.maestri_used,
        adjustment_notes,
        status: "generated", // back to generated so user can validate or adjust again
      })
      .eq("id", question_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ question: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("adjust-conflict-question error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
