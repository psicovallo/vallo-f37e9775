// Edge function: calculateVicePenalty
// Server-side enforcement of all economy mutations on profiles.
// Actions: vice | sovereign | sos_cedo | clean_day | passivity_check

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VICE_DEBT_INCREMENT = 100;
const VICE_LUCIDITY_PENALTY = 15;
const SOVEREIGN_LUCIDITY_GAIN = 2;
const SOVEREIGN_DEBT_REDUCTION_BASE = 25;
const PASSIVITY_TAX = 50;
const CLEAN_DAY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const PASSIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type Action = 'vice' | 'sovereign' | 'sos_cedo' | 'clean_day' | 'passivity_check';

interface Body {
  action: Action;
}

// Streak multiplier: 1-6 -> 25, 7-13 -> 50, 14+ -> 100
function debtReductionForStreak(streak: number): number {
  if (streak >= 14) return 100;
  if (streak >= 7) return 50;
  return SOVEREIGN_DEBT_REDUCTION_BASE;
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
    const allowed = ['vice', 'sovereign', 'sos_cedo', 'clean_day', 'passivity_check'];
    if (!body?.action || !allowed.includes(body.action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: readErr } = await supabase
      .from('profiles')
      .select(
        'financial_debt, lucidity_level, sovereign_streak, last_vice_timestamp, last_clean_day_at, last_activity_at, last_passivity_tax_at',
      )
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
    let newCleanDay: string | null = profile.last_clean_day_at;
    let newPassivityTax: string | null = profile.last_passivity_tax_at;

    const now = new Date();
    const nowIso = now.toISOString();
    let blocked: string | null = null;
    let appliedTax = false;

    if (body.action === 'vice') {
      newDebt += VICE_DEBT_INCREMENT;
      newLucidity = Math.max(0, newLucidity - VICE_LUCIDITY_PENALTY);
      newStreak = 0;
      newVice = nowIso;
    } else if (body.action === 'sos_cedo') {
      newDebt += VICE_DEBT_INCREMENT;
      newLucidity = 0;
      newStreak = 0;
      newVice = nowIso;
    } else if (body.action === 'sovereign') {
      newStreak += 1;
      newLucidity = Math.min(100, newLucidity + SOVEREIGN_LUCIDITY_GAIN);
      const reduction = debtReductionForStreak(newStreak);
      newDebt = Math.max(0, newDebt - reduction);
    } else if (body.action === 'clean_day') {
      // Cooldown 24h
      if (profile.last_clean_day_at) {
        const last = new Date(profile.last_clean_day_at).getTime();
        if (now.getTime() - last < CLEAN_DAY_COOLDOWN_MS) {
          blocked = 'cooldown';
        }
      }
      if (!blocked) {
        newStreak += 1;
        newLucidity = Math.min(100, newLucidity + SOVEREIGN_LUCIDITY_GAIN);
        const reduction = debtReductionForStreak(newStreak);
        newDebt = Math.max(0, newDebt - reduction);
        newCleanDay = nowIso;
      }
    } else if (body.action === 'passivity_check') {
      // Apply +50€ tax if last_activity older than 24h AND last_passivity_tax_at older than 24h (or null)
      const lastActivity = profile.last_activity_at
        ? new Date(profile.last_activity_at).getTime()
        : 0;
      const lastTax = profile.last_passivity_tax_at
        ? new Date(profile.last_passivity_tax_at).getTime()
        : 0;
      const inactive = now.getTime() - lastActivity >= PASSIVITY_THRESHOLD_MS;
      const taxCooldownOk = now.getTime() - lastTax >= PASSIVITY_THRESHOLD_MS;
      if (inactive && taxCooldownOk && lastActivity > 0) {
        newDebt += PASSIVITY_TAX;
        newPassivityTax = nowIso;
        appliedTax = true;
      }
    }

    // Update last_activity_at on any active action (not on passivity_check)
    const isActiveAction =
      body.action === 'vice' ||
      body.action === 'sovereign' ||
      body.action === 'sos_cedo' ||
      (body.action === 'clean_day' && !blocked);

    const updatePayload: Record<string, unknown> = {
      financial_debt: newDebt,
      lucidity_level: newLucidity,
      sovereign_streak: newStreak,
      last_vice_timestamp: newVice,
      last_clean_day_at: newCleanDay,
      last_passivity_tax_at: newPassivityTax,
    };
    if (isActiveAction) {
      updatePayload.last_activity_at = nowIso;
    }

    const { error: updErr } = await supabase
      .from('profiles')
      .update(updatePayload)
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
        blocked,
        applied_tax: appliedTax,
        financial_debt: newDebt,
        lucidity_level: newLucidity,
        sovereign_streak: newStreak,
        last_vice_timestamp: newVice,
        last_clean_day_at: newCleanDay,
        last_activity_at: isActiveAction ? nowIso : profile.last_activity_at,
        last_passivity_tax_at: newPassivityTax,
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
