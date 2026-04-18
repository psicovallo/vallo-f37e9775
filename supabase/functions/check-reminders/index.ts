import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DAY_MAP: Record<number, string> = { 0: 'dom', 1: 'lun', 2: 'mar', 3: 'mer', 4: 'gio', 5: 'ven', 6: 'sab' };

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
  while (times.size < count && attempts < 500) {
    times.add(fmt(startMin + Math.floor(Math.random() * (endMin - startMin))));
    attempts++;
  }
  return [...times].sort();
}

async function sendPush(supabaseUrl: string, serviceKey: string, userId: string, title: string, body: string, data: Record<string, string>, category: string) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify({ user_ids: [userId], title, body, data, category: 'skip-log' }),
    });
    const text = await res.text();
    let result: any = {};
    try { result = JSON.parse(text); } catch {}
    const sent = Number(result.sent || 0);
    console.log(`Push ${userId}: ${title} => sent=${sent}`);

    // Log notification (best-effort, non-blocking)
    try {
      const sb = createClient(supabaseUrl, serviceKey);
      await sb.from('notification_log').insert({
        user_id: userId,
        category,
        title,
        body,
        url: data?.url || null,
      });
    } catch (logErr) {
      console.error('log error:', logErr);
    }

    return sent;
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
    const romeDayNum = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' })).getDay();
    const romeDayKey = DAY_MAP[romeDayNum];

    console.log(`Check at ${romeTime} on ${romeDate} (${romeDayKey})`);

    const { data: allProgress } = await supabase
      .from('question_progress')
      .select('*')
      .eq('onboarding_completed', true);

    let questionPushes = 0;
    let conflictPushes = 0;
    let sfogoPushes = 0;
    let reminderPushes = 0;
    let overtonPushes = 0;

    // Pre-load active Overton shifts for all users
    const { data: activeOverton } = await supabase
      .from('overton_shifts')
      .select('user_id, current_step, goal_text, id')
      .eq('status', 'active');
    const overtonByUser: Record<string, any> = {};
    for (const ov of activeOverton || []) {
      overtonByUser[ov.user_id] = ov;
    }
    // Pre-load current step text
    const overtonStepTexts: Record<string, string> = {};
    if (activeOverton?.length) {
      const shiftIds = activeOverton.map(o => o.id);
      const { data: stepRows } = await supabase
        .from('overton_steps')
        .select('shift_id, step_number, action_text')
        .in('shift_id', shiftIds);
      for (const ov of activeOverton) {
        const stepData = stepRows?.find(s => s.shift_id === ov.id && s.step_number === ov.current_step);
        if (stepData) overtonStepTexts[ov.user_id] = stepData.action_text;
      }
    }

    for (const progress of allProgress || []) {
      const userId = progress.user_id;
      const winStart = progress.notification_window_start || '06:00';
      const winEnd = progress.notification_window_end || '23:00';
      const notifyDays: string[] = progress.notify_days || ['lun','mar','mer','gio','ven','sab','dom'];

      // Skip if today is not an active day
      if (!notifyDays.includes(romeDayKey)) {
        continue;
      }

      // ── QUESTION NOTIFICATIONS ──
      if (progress.notify_questions !== false) {
        const qCount = progress.questions_per_day || 6;
        const qFreq = progress.questions_frequency || 'day';
        let shouldSendQ = false;

        if (qFreq === 'hour') {
          // Per-hour mode: send qCount notifications every hour within the window
          const [wsh, wsm] = winStart.split(':').map(Number);
          const [weh, wem] = winEnd.split(':').map(Number);
          const [ch, cm] = romeTime.split(':').map(Number);
          const curMin = ch * 60 + cm;
          const startMin = wsh * 60 + wsm;
          const endMin = weh * 60 + wem;
          if (curMin >= startMin && curMin < endMin) {
            // Generate random minute slots within the current hour
            let qTimes: string[] = progress.daily_times || [];
            const hourKey = `${romeDate}-${ch}`;
            if (progress.daily_times_date !== hourKey) {
              const hourStart = `${ch.toString().padStart(2,'0')}:00`;
              const hourEnd = `${ch.toString().padStart(2,'0')}:59`;
              qTimes = generateRandomTimes(hourStart, hourEnd, qCount);
              await supabase.from('question_progress')
                .update({ daily_times: qTimes, daily_times_date: hourKey })
                .eq('id', progress.id);
              console.log(`Q hourly times for ${userId} (${qCount}/h): ${qTimes.join(', ')}`);
            }
            shouldSendQ = qTimes.includes(romeTime);
          }
        } else {
          // Per-day mode: send qCount notifications spread across the day
          let qTimes: string[] = progress.daily_times || [];
          if (progress.daily_times_date !== romeDate) {
            qTimes = generateRandomTimes(winStart, winEnd, qCount);
            await supabase.from('question_progress')
              .update({ daily_times: qTimes, daily_times_date: romeDate })
              .eq('id', progress.id);
            console.log(`Q daily times for ${userId} (${qCount}): ${qTimes.join(', ')}`);
          }
          shouldSendQ = qTimes.includes(romeTime);
        }

        if (shouldSendQ) {
          // Overton Override: 50% chance to send Overton reminder instead
          const userOverton = overtonByUser[userId];
          if (userOverton && Math.random() < 0.5 && overtonStepTexts[userId] && progress.notify_overton !== false) {
            const stepText = overtonStepTexts[userId];
            const title = `🎯 Overton Step ${userOverton.current_step}`;
            const body = progress.custom_overton_text?.trim()
              ? progress.custom_overton_text.trim()
              : `Il Consiglio osserva. La finestra è aperta sullo Step ${userOverton.current_step}. ${stepText.slice(0, 80)}`;
            overtonPushes += await sendPush(supabaseUrl, serviceKey, userId, title, body, { url: '/overton' }, 'overton');
          } else {
            const { data: assignments } = await supabase
              .from('question_assignments')
              .select('*')
              .eq('user_id', userId)
              .order('sort_order', { ascending: true });

            if (assignments?.length) {
              const { count: todayCount } = await supabase
                .from('question_deliveries')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('delivered_at', `${romeDate}T00:00:00`)
                .lte('delivered_at', `${romeDate}T23:59:59`);

              const idx = (todayCount || 0) % assignments.length;
              const assignment = assignments[idx];

              await supabase.from('question_deliveries').insert({
                user_id: userId,
                question_index: assignment.sort_order,
                delivered_at: now.toISOString(),
              });

              const title = `🔥 Domanda ${assignment.sort_order}`;
              const body = progress.custom_questions_text?.trim()
                ? progress.custom_questions_text.trim()
                : assignment.question_text.slice(0, 100) + (assignment.question_text.length > 100 ? '...' : '');
              questionPushes += await sendPush(supabaseUrl, serviceKey, userId, title, body, { url: '/question' }, 'questions');
            }
          }
        }
      }

      // ── SOS DNA NOTIFICATIONS ──
      if (progress.notify_dna !== false) {
        const dnaCount = progress.dna_per_day || 6;
        const dnaFreq = progress.dna_frequency || 'day';
        let shouldSendDna = false;

        if (dnaFreq === 'hour') {
          const [wsh, wsm] = winStart.split(':').map(Number);
          const [weh, wem] = winEnd.split(':').map(Number);
          const [ch, cm] = romeTime.split(':').map(Number);
          const curMin = ch * 60 + cm;
          const startMin = wsh * 60 + wsm;
          const endMin = weh * 60 + wem;
          if (curMin >= startMin && curMin < endMin) {
            let dnaTimes: string[] = progress.dna_daily_times || [];
            const hourKey = `${romeDate}-${ch}`;
            if (progress.dna_daily_times_date !== hourKey) {
              const hourStart = `${ch.toString().padStart(2,'0')}:00`;
              const hourEnd = `${ch.toString().padStart(2,'0')}:59`;
              dnaTimes = generateRandomTimes(hourStart, hourEnd, dnaCount);
              await supabase.from('question_progress')
                .update({ dna_daily_times: dnaTimes, dna_daily_times_date: hourKey })
                .eq('id', progress.id);
              console.log(`DNA hourly times for ${userId} (${dnaCount}/h): ${dnaTimes.join(', ')}`);
            }
            shouldSendDna = dnaTimes.includes(romeTime);
          }
        } else {
          let dnaTimes: string[] = progress.dna_daily_times || [];
          if (progress.dna_daily_times_date !== romeDate) {
            dnaTimes = generateRandomTimes(winStart, winEnd, dnaCount);
            await supabase.from('question_progress')
              .update({ dna_daily_times: dnaTimes, dna_daily_times_date: romeDate })
              .eq('id', progress.id);
            console.log(`DNA daily times for ${userId} (${dnaCount}): ${dnaTimes.join(', ')}`);
          }
          shouldSendDna = dnaTimes.includes(romeTime);
        }

        if (shouldSendDna) {
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
            const body = progress.custom_dna_text?.trim()
              ? progress.custom_dna_text.trim()
              : randomQ.question_text.slice(0, 100) + (randomQ.question_text.length > 100 ? '...' : '');
            conflictPushes += await sendPush(supabaseUrl, serviceKey, userId, title, body, { url: `/dna-question?id=${randomQ.id}` }, 'dna');
          }
        }
      }

      // ── SFOGO NOTIFICATIONS ──
      if (progress.notify_sfogo !== false) {
        const sfogoCount = progress.sfogo_per_day || 6;
        const sfogoFreq = progress.sfogo_frequency || 'day';
        let shouldSendSfogo = false;

        if (sfogoFreq === 'hour') {
          const [wsh, wsm] = winStart.split(':').map(Number);
          const [weh, wem] = winEnd.split(':').map(Number);
          const [ch, cm] = romeTime.split(':').map(Number);
          const curMin = ch * 60 + cm;
          const startMin = wsh * 60 + wsm;
          const endMin = weh * 60 + wem;
          if (curMin >= startMin && curMin < endMin) {
            let sfogoTimes: string[] = progress.sfogo_daily_times || [];
            const hourKey = `${romeDate}-${ch}`;
            if (progress.sfogo_daily_times_date !== hourKey) {
              const hourStart = `${ch.toString().padStart(2,'0')}:00`;
              const hourEnd = `${ch.toString().padStart(2,'0')}:59`;
              sfogoTimes = generateRandomTimes(hourStart, hourEnd, sfogoCount);
              await supabase.from('question_progress')
                .update({ sfogo_daily_times: sfogoTimes, sfogo_daily_times_date: hourKey })
                .eq('id', progress.id);
              console.log(`Sfogo hourly times for ${userId} (${sfogoCount}/h): ${sfogoTimes.join(', ')}`);
            }
            shouldSendSfogo = sfogoTimes.includes(romeTime);
          }
        } else {
          let sfogoTimes: string[] = progress.sfogo_daily_times || [];
          if (progress.sfogo_daily_times_date !== romeDate) {
            sfogoTimes = generateRandomTimes(winStart, winEnd, sfogoCount);
            await supabase.from('question_progress')
              .update({ sfogo_daily_times: sfogoTimes, sfogo_daily_times_date: romeDate })
              .eq('id', progress.id);
            console.log(`Sfogo daily times for ${userId} (${sfogoCount}): ${sfogoTimes.join(', ')}`);
          }
          shouldSendSfogo = sfogoTimes.includes(romeTime);
        }

        if (shouldSendSfogo) {
          // Get sfogo reflection notes
          const { data: sfogoNotes } = await supabase
            .from('notes')
            .select('id, text')
            .eq('user_id', userId)
            .ilike('text', '[SFOGO-RIFLESSIONE]%')
            .order('created_at', { ascending: false })
            .limit(50);

          if (sfogoNotes?.length) {
            const randomNote = sfogoNotes[Math.floor(Math.random() * sfogoNotes.length)];
            const qMatch = randomNote.text.match(/Q:\s*(.*?)(?:\nA:|$)/s);
            const questionText = qMatch ? qMatch[1].trim() : randomNote.text.slice(0, 100);
            const title = '🔥 Riflessione Sfogo';
            const body = progress.custom_sfogo_text?.trim()
              ? progress.custom_sfogo_text.trim()
              : questionText.slice(0, 100) + (questionText.length > 100 ? '...' : '');
            sfogoPushes += await sendPush(supabaseUrl, serviceKey, userId, title, body, { url: `/sfogo-question?id=${randomNote.id}` }, 'sfogo');
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
      reminderPushes += await sendPush(supabaseUrl, serviceKey, reminder.user_id, '⏰ Promemoria', reminder.text, { url: '/reminders' }, 'reminder');
    }

    const result = { checked: romeTime, date: romeDate, day: romeDayKey, users: allProgress?.length || 0, question_sent: questionPushes, conflict_sent: conflictPushes, sfogo_sent: sfogoPushes, overton_sent: overtonPushes, reminder_sent: reminderPushes, total_sent: questionPushes + conflictPushes + sfogoPushes + overtonPushes + reminderPushes };
    console.log('Result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('check-reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
