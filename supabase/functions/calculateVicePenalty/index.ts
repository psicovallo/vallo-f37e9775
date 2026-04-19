// Edge function: calculateVicePenalty
// Server-side enforcement of Vice / Sovereign Action mutations on profiles.
// Prevents client tampering with debt, lucidity, streak.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VICE_DEBT_INCREMENT = 100; // €
const VICE_LUCIDITY_PENALTY = 15;
const SOVEREIGN_LUCIDITY_GAIN = 2;

type Action = 'vice' | 'sovereign' | 'sos_cedo';

interface Body {
  action: Action;
  // optional override (e.g. SOS DNA "Cedo" zeroes lucidity entirely)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = (await req.json()) as Body;
    if (!body?.action || !['vice', 'sovereign', 'sos_cedo'].includes(body.action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read current state
    const { data: profile, error: readErr } = await supabase
      .from('profiles')
      .select('financial_debt, lucidity_level, sovereign_streak, last_vice_timestamp')
      .eq('user_id', userId)
      .maybeSingle();

    if (readErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let newDebt = Number(profile.financial_debt) || 0;
    let newLucidity = Number(profile.lucidity_level) || 0;
    let newStreak = Number(profile.sovereign_streak) || 0;
    let newVice: string | null = profile.last_vice_timestamp;

    const now = new Date().toISOString();

    if (body.action === 'vice') {
      newDebt += VICE_DEBT_INCREMENT;
      newLucidity = Math.max(0, newLucidity - VICE_LUCIDITY_PENALTY);
      newStreak = 0;
      newVice = now;
    } else if (body.action === 'sos_cedo') {
      // Brutal: SOS DNA capitulation costs more
      newDebt += VICE_DEBT_INCREMENT;
      newLucidity = 0; // azzera la lucidità
      newStreak = 0;
      newVice = now;
    } else if (body.action === 'sovereign') {
      newStreak += 1;
      newLucidity = Math.min(100, newLucidity + SOVEREIGN_LUCIDITY_GAIN);
    }

    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        financial_debt: newDebt,
        lucidity_level: newLucidity,
        sovereign_streak: newStreak,
        last_vice_timestamp: newVice,
      })
      .eq('user_id', userId);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        action: body.action,
        financial_debt: newDebt,
        lucidity_level: newLucidity,
        sovereign_streak: newStreak,
        last_vice_timestamp: newVice,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
