import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id, goal_text } = await req.json();
    if (!user_id || !goal_text) {
      return new Response(JSON.stringify({ error: 'Missing user_id or goal_text' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load profile
    const { data: profile } = await supabase.from('profiles').select('objective, current_problems, vision, communication_style, ai_profile_analysis').eq('user_id', user_id).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `Sei il Consiglio dei 15 Maestri (Bandler, Ellis, Carr, Freud, Jung, Frankl, Erickson, Watzlawick, Cialdini, Carnegie, Marco Aurelio, Peterson, Machiavelli, Socrate, Nietzsche).

REGOLA LINGUA ASSOLUTA: Rispondi ESCLUSIVAMENTE in italiano. Ogni parola deve essere in italiano.

L'utente ha dichiarato un'azione che ritiene IMPOSSIBILE o INACCETTABILE. Il tuo compito è scomporre questa azione in 4 micro-azioni crescenti che spostino progressivamente la "Finestra di Overton" personale dell'utente, dal RADICALE al DOMINIO.

PROFILO UTENTE:
- Obiettivo: ${profile.objective || 'Non specificato'}
- Problemi attuali: ${profile.current_problems || 'Non specificati'}
- Visione: ${profile.vision || 'Non specificata'}
- Stile comunicativo: ${profile.communication_style || 'Non specificato'}
- Analisi AI: ${profile.ai_profile_analysis || 'Nessuna'}

AZIONE IMPOSSIBILE DICHIARATA: "${goal_text}"

STEP FISSI:
- Step 1 (IMPENSABILE - Il Tabù): È l'azione impossibile dichiarata dall'utente. NON generare nulla per questo step.
- Step 2 (RADICALE - La Frattura): La prima micro-azione che rompe lo schema.
- Step 3 (ACCETTABILE - L'Azione): Un'azione concreta che rende il cambiamento tangibile.
- Step 4 (NORMA - L'Abitudine): L'azione diventa routine quotidiana.
- Step 5 (DOMINIO - Il Nuovo DNA): L'utente ha integrato completamente il nuovo comportamento.

REGOLE:
- Ogni micro-azione deve essere CONCRETA, MISURABILE e ESEGUIBILE in max 48 ore.
- Usa il linguaggio del Consiglio: diretto, chirurgico, senza pietà ma con rispetto.
- Le azioni devono essere progressivamente più audaci.

Rispondi SOLO con un JSON array di 4 oggetti (step 2-5):
[{"step_number": 2, "label": "RADICALE", "action_text": "..."}, ...]`;

    // Retry logic for transient DNS/network errors
    const callAI = async (attempt = 1): Promise<Response> => {
      try {
        return await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableKey}` },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Scomponi questa azione impossibile in 4 step crescenti: "${goal_text}"` },
            ],
            temperature: 0.8,
          }),
        });
      } catch (err) {
        if (attempt < 3) {
          console.log(`AI call attempt ${attempt} failed, retrying...`, err);
          await new Promise(r => setTimeout(r, 500 * attempt));
          return callAI(attempt + 1);
        }
        throw err;
      }
    };

    const aiRes = await callAI();
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite di richieste raggiunto. Riprova tra qualche minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'Crediti AI esauriti. Contatta il supporto.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI gateway returned ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let generatedSteps;
    try {
      generatedSteps = JSON.parse(content);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Il Consiglio ha risposto in modo non valido. Riprova.');
    }
    
    if (!Array.isArray(generatedSteps) || generatedSteps.length !== 4) {
      console.error('Invalid steps structure:', generatedSteps);
      throw new Error('Struttura step non valida. Riprova.');
    }

    // Create the shift
    const { data: newShift, error: shiftErr } = await supabase.from('overton_shifts').insert({
      user_id,
      goal_text,
      current_step: 1,
      status: 'active',
      step_confirmed_at: new Date().toISOString(),
    }).select().single();

    if (shiftErr) throw shiftErr;

    // Insert step 1 (the user's original goal)
    const allSteps = [
      { shift_id: newShift.id, user_id, step_number: 1, label: 'IMPENSABILE', action_text: goal_text, confirmed: false },
      ...generatedSteps.map((s: any) => ({
        shift_id: newShift.id,
        user_id,
        step_number: s.step_number,
        label: s.label,
        action_text: s.action_text,
        confirmed: false,
      })),
    ];

    await supabase.from('overton_steps').insert(allSteps);

    return new Response(JSON.stringify({ success: true, shift_id: newShift.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('generate-overton-steps error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
