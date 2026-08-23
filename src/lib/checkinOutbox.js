import { resolveCloudUserIdByUsername } from './cloudUser';

const OUTBOX_KEY = 'moodify_checkin_outbox_v1';

const loadOutbox = () => {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveOutbox = (items) => {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-500)));
};

export const enqueueCheckinOutbox = (payload) => {
  const queue = loadOutbox();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    ...payload
  });
  saveOutbox(queue);
};

const toDayRange = (iso) => {
  const dt = new Date(iso);
  const start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const end = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
};

export const flushCheckinOutbox = async ({ supabase, resolveUserId } = {}) => {
  if (!supabase) return { sent: 0, failed: 0, remaining: loadOutbox().length };

  const queue = loadOutbox();
  if (!queue.length) return { sent: 0, failed: 0, remaining: 0 };

  const keep = [];
  let sent = 0;

  for (const item of queue) {
    let userId = item.user_id || null;
    if (!userId && typeof resolveUserId === 'function') {
      try {
        userId = await resolveUserId(item.username || '');
      } catch {
        userId = null;
      }
    }

    if (!userId) {
      try {
        userId = await resolveCloudUserIdByUsername({ supabase, username: item.username || '' });
      } catch {
        userId = null;
      }
    }

    if (!userId) {
      keep.push(item);
      continue;
    }

    try {
      const createdAt = item.entry_date || item.created_at;
      const { startIso, endIso } = toDayRange(createdAt);
      const { data: existing, error: checkError } = await supabase
        .from('checkins')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .limit(1);

      if (checkError) {
        keep.push(item);
        continue;
      }

      if (Array.isArray(existing) && existing.length > 0) {
        sent += 1;
        continue;
      }

      const { error: insertError } = await supabase.from('checkins').insert({
        user_id: userId,
        mood: item.mood,
        sadness: item.sadness,
        anxiety: item.anxiety,
        stress: item.stress,
        journal: item.journal || '',
        created_at: createdAt
      });

      if (insertError) {
        if (insertError.code === '23505') {
          sent += 1;
          continue;
        }
        keep.push(item);
      } else {
        sent += 1;
      }
    } catch {
      keep.push(item);
    }
  }

  saveOutbox(keep);
  return { sent, failed: keep.length, remaining: keep.length };
};
