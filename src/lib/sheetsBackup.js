const BACKUP_QUEUE_KEY = 'moodify_sheets_backup_queue_v1';

const getWebhookUrl = () => import.meta.env.VITE_SHEETS_WEBHOOK_URL || '';
const getSourceLabel = () => import.meta.env.VITE_SHEETS_SOURCE_LABEL || 'moodify-web';

const loadQueue = () => {
  try {
    const raw = localStorage.getItem(BACKUP_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveQueue = (items) => {
  localStorage.setItem(BACKUP_QUEUE_KEY, JSON.stringify(items.slice(-2000)));
};

export const enqueueSheetsBackup = ({ eventType, username, payload }) => {
  const queue = loadQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventType: eventType || 'unknown_event',
    username: username || localStorage.getItem('moodify_currentUser') || 'unknown',
    payload: payload || {},
    source: getSourceLabel(),
    createdAt: new Date().toISOString()
  });
  saveQueue(queue);
};

export const flushSheetsBackupQueue = async () => {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return { sent: 0, failed: 0, remaining: loadQueue().length, disabled: true };
  }

  const queue = loadQueue();
  if (!queue.length) {
    return { sent: 0, failed: 0, remaining: 0, disabled: false };
  }

  const keep = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          event_type: item.eventType,
          username: item.username,
          payload: item.payload,
          source: item.source,
          created_at: item.createdAt
        })
      });

      if (!response.ok) {
        keep.push(item);
      } else {
        sent += 1;
      }
    } catch {
      keep.push(item);
    }
  }

  saveQueue(keep);
  return { sent, failed: keep.length, remaining: keep.length, disabled: false };
};
