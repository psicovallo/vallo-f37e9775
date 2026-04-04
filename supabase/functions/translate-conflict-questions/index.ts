import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conflict_profile_id, lingua_bersaglio } = await req.json();
    if (!conflict_profile_id || !lingua_bersaglio || lingua_bersaglio === "italiano") {
      return new Response(JSON.stringify({ error: "Parametri mancanti o lingua italiano" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all questions for this profile that don't have a translation yet
    const { data: questions, error: qErr } = await supabase
      .from("conflict_questions")
      .select("id, question_text")
      .eq("conflict_profile_id", conflict_profile_id)
      .is("question_text_translated", null)
      .in("status", ["generated", "validated", "adjusted"]);

    if (qErr) throw qErr;
    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ translated: 0, message: "Tutte le domande sono già tradotte." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Batch translate - send all texts at once
    const textsToTranslate = questions.map((q: any) => q.question_text);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sei un traduttore. Traduci ogni frase dall'italiano al ${lingua_bersaglio}. Mantieni lo stesso tono, intensità e significato. RISPONDI SOLO con un JSON array di stringhe tradotte, nello stesso ordine.`,
          },
          {
            role: "user",
            content: JSON.stringify(textsToTranslate),
          },
        ],
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "[]";

    let translations: string[];
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      translations = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      console.error("Failed to parse translations:", raw);
      return new Response(JSON.stringify({ error: "Errore nel parsing delle traduzioni" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update each question with its translation
    let updated = 0;
    for (let i = 0; i < questions.length && i < translations.length; i++) {
      const { error: upErr } = await supabase
        .from("conflict_questions")
        .update({ question_text_translated: translations[i] })
        .eq("id", questions[i].id);
      if (!upErr) updated++;
    }

    return new Response(JSON.stringify({ translated: updated, total: questions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-conflict-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
