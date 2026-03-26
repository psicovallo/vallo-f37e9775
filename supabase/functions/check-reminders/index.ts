import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateRandomTimes(start: string, end: string, count: number): string[] {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes || count < 2) return [];

  const fmt = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const times: Set<string> = new Set();

  // First notification within first hour
  const firstEnd = Math.min(startMinutes + 60, endMinutes);
  times.add(fmt(startMinutes + Math.floor(Math.random() * (firstEnd - startMinutes))));

  // Last notification within last hour
  const lastStart = Math.max(endMinutes - 60, startMinutes);
  times.add(fmt(lastStart + Math.floor(Math.random() * (endMinutes - lastStart))));

  // Fill remaining randomly
  let attempts = 0;
  while (times.size < count && attempts < 200) {
    const randomMin = startMinutes + Math.floor(Math.random() * (endMinutes - startMinutes));
    times.add(fmt(randomMin));
    attempts++;
  }

  return [...times].sort();
}

async function sendPush(userId: string, title: string, body: string, data: Record<string, string>) {
  const sendUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`;
  try {
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ user_ids: [userId], title, body, data }),
    });
    const text = await response.text();
    let result: { sent?: number } = {};
    try { result = JSON.parse(text); } catch { /* ignore */ }
    console.log(`Push to ${userId}: status=${response.status} sent=${result.sent || 0} title="${title}"`);
    return Number(result.sent || 0);
  } catch (e) {
    console.error(`Push error for ${userId}:`, e);
    return 0;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const romeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const romeDate = romeFormatter.format(now);
    const romeTime = now.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    console.log(`Check at ${romeTime} on ${romeDate}`);

    // ── 1. QUESTION NOTIFICATIONS ──
    const { data: allProgress } = await supabase
      .from('question_progress')
      .select('*')
      .eq('onboarding_completed', true);

    let questionPushes = 0;

    for (const progress of allProgress || []) {
      const userId = progress.user_id;
      const winStart = progress.notification_window_start || '06:00';
      const winEnd = progress.notification_window_end || '22:00';

      // Generate or reuse daily times
      let dailyTimes: string[] = progress.daily_times || [];
      if (progress.daily_times_date !== romeDate) {
        dailyTimes = generateRandomTimes(winStart, winEnd, 6);
        await supabase
          .from('question_progress')
          .update({ daily_times: dailyTimes, daily_times_date: romeDate })
          .eq('id', progress.id);
        console.log(`Generated question times for ${userId}: ${dailyTimes.join(', ')}`);
      }

      if (!dailyTimes.includes(romeTime)) continue;

      // Get ALL unresolved assignments, cycle through them
      const { data: assignments } = await supabase
        .from('question_assignments')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'risolta')
        .order('sort_order', { ascending: true });

      if (!assignments?.length) {
        // No unresolved questions — re-send oldest resolved one to keep the cycle going
        const { data: resolved } = await supabase
          .from('question_assignments')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'risolta')
          .order('sort_order', { ascending: true })
          .limit(1);

        if (resolved?.length) {
          // Reset it to da_leggere so it cycles again
          await supabase
            .from('question_assignments')
            .update({ status: 'da_leggere', view_count: 0, phase_b_unlock_at: null })
            .eq('id', resolved[0].id);
          console.log(`Recycled question ${resolved[0].sort_order} for ${userId}`);
        } else {
          console.log(`No assignments at all for ${userId}`);
          continue;
        }
      }

      // Count how many pushes already sent today for questions
      const { count: todayCount } = await supabase
        .from('question_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('delivered_at', `${romeDate}T00:00:00`)
        .lte('delivered_at', `${romeDate}T23:59:59`);

      // Pick the question to send: rotate through assignments by today's delivery count
      const activeAssignments = assignments?.length ? assignments : [];
      if (!activeAssignments.length) continue;
      
      const idx = (todayCount || 0) % activeAssignments.length;
      const assignment = activeAssignments[idx];

      // Mark old unread deliveries as read
      await supabase
        .from('question_deliveries')
        .update({ read_completed: true, read_at: now.toISOString() })
        .eq('user_id', userId)
        .eq('read_completed', false)
        .lt('delivered_at', `${romeDate}T00:00:00`);

      // Create new delivery
      await supabase.from('question_deliveries').insert({
        user_id: userId,
        question_index: assignment.sort_order,
        delivered_at: now.toISOString(),
      });

      const title = `🔥 Domanda ${assignment.sort_order}`;
      const body = assignment.question_text.slice(0, 100) + (assignment.question_text.length > 100 ? '...' : '');
      questionPushes += await sendPush(userId, title, body, { url: '/question' });
    }

    // ── 2. SOS DNA CONFLICT NOTIFICATIONS ──
    // Get all users who have conflict questions
    const { data: conflictUsers } = await supabase
      .from('conflict_questions')
      .select('user_id')
      .in('status', ['generated', 'validated']);
    
    const uniqueConflictUsers = [...new Set((conflictUsers || []).map(c => c.user_id))];
    let conflictPushes = 0;

    for (const userId of uniqueConflictUsers) {
      // Get or create daily conflict times for this user
      const progressEntry = (allProgress || []).find(p => p.user_id === userId);
      const winStart = progressEntry?.notification_window_start || '06:00';
      const winEnd = progressEntry?.notification_window_end || '22:00';

      // Use a separate daily_times system: store in a simple key based on userId
      // We'll generate times and check against romeTime
      // For simplicity, generate deterministic-random times based on date + userId
      const seed = romeDate + userId;
      const conflictTimes = generateRandomTimes(winStart, winEnd, 6);
      
      // Check if current time matches any (with tolerance: we generate same times for same seed)
      // Since we can't store conflict-specific times easily, use hash-based matching
      const hash = Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const baseMinutes = parseInt(winStart.split(':')[0]) * 60;
      const endMinutes = parseInt(winEnd.split(':')[0]) * 60;
      const range = endMinutes - baseMinutes;
      
      // Generate 6 deterministic times from seed
      const detTimes: string[] = [];
      for (let i = 0; i < 6; i++) {
        const offset = ((hash * (i + 1) * 7919) % range);
        const totalMin = baseMinutes + offset;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        detTimes.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }

      if (!detTimes.includes(romeTime)) continue;

      // Get a random conflict question to send
      const { data: questions } = await supabase
        .from('conflict_questions')
        .select('*, conflict_profiles!inner(name)')
        .eq('user_id', userId)
        .in('status', ['generated', 'validated'])
        .limit(20);

      if (!questions?.length) continue;

      const randomQ = questions[Math.floor(Math.random() * questions.length)];
      const profileName = (randomQ as any).conflict_profiles?.name || 'Bersaglio';
      
      const title = `⚔️ DNA: ${profileName}`;
      const body = randomQ.question_text.slice(0, 100) + (randomQ.question_text.length > 100 ? '...' : '');
      conflictPushes += await sendPush(userId, title, body, { url: '/sos-conflitti' });
    }

    // ── 3. REMINDER NOTIFICATIONS ──
    const { data: scheduledReminders } = await supabase
      .from('reminders')
      .select('id, user_id, text')
      .eq('active', true)
      .contains('times', [romeTime]);

    let reminderPushes = 0;
    for (const reminder of scheduledReminders || []) {
      reminderPushes += await sendPush(
        reminder.user_id,
        '⏰ Promemoria',
        reminder.text,
        { url: '/reminders' }
      );
    }

    const result = {
      checked: romeTime,
      date: romeDate,
      users: allProgress?.length || 0,
      question_sent: questionPushes,
      conflict_sent: conflictPushes,
      reminder_sent: reminderPushes,
      total_sent: questionPushes + conflictPushes + reminderPushes,
    };
    console.log('Result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('check-reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
