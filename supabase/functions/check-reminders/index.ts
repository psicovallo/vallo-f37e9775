import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateRandomTimes(start: string, end: string, count: number): string[] {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  if (endMin <= startMin || count < 1) return [];

  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  const times = new Set<string>();
  // First in first hour
  const firstEnd = Math.min(startMin + 60, endMin);
  times.add(fmt(startMin + Math.floor(Math.random() * (firstEnd - startMin))));
  // Last in last hour
  if (count >= 2) {
    const lastStart = Math.max(endMin - 60, startMin);
    times.add(fmt(lastStart + Math.floor(Math.random() * (endMin - lastStart))));
  }
  // Fill rest randomly
  let attempts = 0;
  while (times.size < count && attempts < 300) {
    times.add(fmt(startMin + Math.floor(Math.random() * (endMin - startMin))));
    attempts++;
  }
  return [...times].sort();
}

async function sendPush(supabaseUrl: string, serviceKey: string, userId: string, title: string, body: string, data: Record<string, string>) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify({ user_ids: [userId], title, body, data }),
    });
    const text = await res.text();
    let result: any = {};
    try { result = JSON.parse(text); } catch {}
    console.log(`Push ${userId}: ${title} => sent=${result.sent || 0}`);
    return Number(result.sent || 0);
  } catch (e) {
    console.error(`Push error ${userId}:`, e);
    return 0;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const romeDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const romeTime = now.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false });

    console.log(`Check at ${romeTime} on ${romeDate}`);

    const { data: allProgress } = await supabase
      .from('question_progress')
      .select('*')
      .eq('onboarding_completed', true);

    let questionPushes = 0;
    let conflictPushes = 0;
    let reminderPushes = 0;

    for (const progress of allProgress || []) {
      const userId = progress.user_id;
      const winStart = progress.notification_window_start || '06:00';
      const winEnd = progress.notification_window_end || '22:00';

      // ── QUESTION NOTIFICATIONS ──
      if (progress.notify_questions !== false) {
        // Generate or reuse daily question times
        let qTimes: string[] = progress.daily_times || [];
        if (progress.daily_times_date !== romeDate) {
          qTimes = generateRandomTimes(winStart, winEnd, 6);
          await supabase.from('question_progress')
            .update({ daily_times: qTimes, daily_times_date: romeDate })
            .eq('id', progress.id);
          console.log(`Q times for ${userId}: ${qTimes.join(', ')}`);
        }

        if (qTimes.includes(romeTime)) {
          // Get assignments - cycle through all of them
          const { data: assignments } = await supabase
            .from('question_assignments')
            .select('*')
            .eq('user_id', userId)
            .order('sort_order', { ascending: true });

          if (assignments?.length) {
            // Count today's deliveries to rotate
            const { count: todayCount } = await supabase
              .from('question_deliveries')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .gte('delivered_at', `${romeDate}T00:00:00`)
              .lte('delivered_at', `${romeDate}T23:59:59`);

            const idx = (todayCount || 0) % assignments.length;
            const assignment = assignments[idx];

            // Create delivery record
            await supabase.from('question_deliveries').insert({
              user_id: userId,
              question_index: assignment.sort_order,
              delivered_at: now.toISOString(),
            });

            const title = `🔥 Domanda ${assignment.sort_order}`;
            const body = assignment.question_text.slice(0, 100) + (assignment.question_text.length > 100 ? '...' : '');
            questionPushes += await sendPush(supabaseUrl, serviceKey, userId, title, body, { url: '/question' });
          }
        }
      }

      // ── SOS DNA NOTIFICATIONS ──
      if (progress.notify_dna !== false) {
        let dnaTimes: string[] = progress.dna_daily_times || [];
        if (progress.dna_daily_times_date !== romeDate) {
          dnaTimes = generateRandomTimes(winStart, winEnd, 6);
          await supabase.from('question_progress')
            .update({ dna_daily_times: dnaTimes, dna_daily_times_date: romeDate })
            .eq('id', progress.id);
          console.log(`DNA times for ${userId}: ${dnaTimes.join(', ')}`);
        }

        if (dnaTimes.includes(romeTime)) {
          // Get active conflict questions for this user
          const { data: questions } = await supabase
            .from('conflict_questions')
            .select('*, conflict_profiles!inner(name)')
            .eq('user_id', userId)
            .in('status', ['generated', 'validated'])
            .limit(50);

          if (questions?.length) {
            const randomQ = questions[Math.floor(Math.random() * questions.length)];
            const profileName = (randomQ as any).conflict_profiles?.name || 'Bersaglio';
            const title = `⚔️ DNA: ${profileName}`;
            const body = randomQ.question_text.slice(0, 100) + (randomQ.question_text.length > 100 ? '...' : '');
            conflictPushes += await sendPush(supabaseUrl, serviceKey, userId, title, body, { url: '/sos-conflitti' });
          }
        }
      }
    }

    // ── REMINDER NOTIFICATIONS ──
    const { data: scheduledReminders } = await supabase
      .from('reminders')
      .select('id, user_id, text')
      .eq('active', true)
      .contains('times', [romeTime]);

    for (const reminder of scheduledReminders || []) {
      reminderPushes += await sendPush(supabaseUrl, serviceKey, reminder.user_id, '⏰ Promemoria', reminder.text, { url: '/reminders' });
    }

    const result = { checked: romeTime, date: romeDate, users: allProgress?.length || 0, question_sent: questionPushes, conflict_sent: conflictPushes, reminder_sent: reminderPushes, total_sent: questionPushes + conflictPushes + reminderPushes };
    console.log('Result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('check-reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
