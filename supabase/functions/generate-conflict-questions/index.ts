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
    const { conflict_profile_id, language = "italiano" } = await req.json();

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
      .select("question_text, maestri_used")
      .eq("conflict_profile_id", conflict_profile_id)
      .eq("status", "validated")
      .order("created_at", { ascending: false })
      .limit(10);

    const prevText = prevQuestions?.length
      ? prevQuestions.map((q: any, i: number) => `${i + 1}. ${q.question_text} (Maestri: ${q.maestri_used})`).join("\n")
      : "";

    const systemPrompt = `SEI IL CONSIGLIO DEI 15 MAESTRI. Lavorate TUTTI INSIEME come un unico organismo analitico.
Il vostro scopo: generare 3 DOMANDE LETALI che l'utente potrà usare nel conflitto con il bersaglio.

BERSAGLIO:
- Nome: ${profile.name}
- Relazione: ${profile.relationship}
- Profilo psicologico: ${profile.profile_description}
- Storico fallimenti: ${profile.failure_history}

${prevText ? `DOMANDE GIÀ VALIDATE (cambia strategia, usa leve diverse):\n${prevText}` : ""}

I 15 MAESTRI:
${MAESTRI_CONFLITTI.join("\n")}

PROTOCOLLO:
1. ANALISI INCROCIATA: Ogni maestro analizza il profilo dalla sua specializzazione.
2. VAGLIO: Ogni domanda deve essere validata da almeno 3 maestri (Logica, Ombra, Potere).
3. TRINITÀ: Genera 3 domande con sfumature diverse ma obiettivo unico: portare l'altro a Zero.
4. VALIDAZIONE TECNICA: Per ogni domanda, spiega QUALE maestro l'ha ispirata e PERCHÉ quella leva scardinerà il conflitto.

REGOLE:
- Le domande devono essere in ${language}.
- NO domande che permettono risposte a monosillabi.
- NO domande che offrono scuse implicite.
- Ogni domanda deve essere TAGLIENTE e SPIETATA ma INTELLIGENTE.
- Le domande sono fatte per essere POSTE AL BERSAGLIO dall'utente.

RISPONDI SOLO con un JSON valido (array di 3 oggetti):
[
  {"text": "domanda 1", "validation": "spiegazione tecnica", "maestri_used": "Maestro1, Maestro2, Maestro3"},
  {"text": "domanda 2", "validation": "spiegazione tecnica", "maestri_used": "Maestro1, Maestro2, Maestro3"},
  {"text": "domanda 3", "validation": "spiegazione tecnica", "maestri_used": "Maestro1, Maestro2, Maestro3"}
]`;

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
          { role: "user", content: `Genera le 3 domande letali per ${profile.name} (${profile.relationship}). Lingua: ${language}.` },
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

    // Extract JSON from response
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

    // Save to DB
    const inserts = questions.map((q: any) => ({
      conflict_profile_id,
      user_id: profile.user_id,
      question_text: q.text,
      validation_text: q.validation,
      maestri_used: q.maestri_used,
      status: "generated",
    }));

    const { data: saved, error: insertError } = await supabase
      .from("conflict_questions")
      .insert(inserts)
      .select();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ questions: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-conflict-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
