const QUEUE_KEY = 'moodify_analytics_queue';

const getQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
};

const toAnalyticsRow = (eventName, payload = {}) => ({
  event_name: eventName,
  payload,
  username: localStorage.getItem('moodify_currentUser') || null,
  occurred_at: new Date().toISOString()
});

const enqueueEvent = (row) => {
  const queue = getQueue();
  queue.push(row);
  setQueue(queue.slice(-200));
};

export const flushAnalyticsQueue = async () => {
  return;
};

export const trackEvent = async (eventName, payload = {}) => {
  const row = toAnalyticsRow(eventName, payload);
  enqueueEvent(row);
};
