import { trackEvent } from './analytics';

let reminderTimer = null;

const clearReminderTimer = () => {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
};

const parseReminderTime = (value) => {
  const fallback = { hour: 20, minute: 0 };
  if (!value || typeof value !== 'string' || !value.includes(':')) return fallback;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return { hour: Math.min(23, Math.max(0, h)), minute: Math.min(59, Math.max(0, m)) };
};

const getNextReminderTimestamp = (hour, minute) => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
};

const showReminderNotification = (username) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const title = 'Waktunya Check-in SUGARSENSE';
  const body = username
    ? `${username}, luangkan 1 menit untuk check-in mood kamu hari ini.`
    : 'Luangkan 1 menit untuk check-in mood kamu hari ini.';
  new Notification(title, { body, tag: 'moodify-daily-reminder' });
  trackEvent('reminder_fired', { username }).catch(() => {});
};

const scheduleReminder = (username, reminderTime) => {
  clearReminderTimer();
  const { hour, minute } = parseReminderTime(reminderTime);
  const nextAt = getNextReminderTimestamp(hour, minute);
  const delay = Math.max(1000, nextAt - Date.now());

  reminderTimer = setTimeout(() => {
    showReminderNotification(username);
    scheduleReminder(username, reminderTime);
  }, delay);
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  const permission = await Notification.requestPermission();
  return permission;
};

export const configureDailyReminder = async () => {
  const username = localStorage.getItem('moodify_currentUser');
  if (!username) {
    clearReminderTimer();
    return;
  }

  const userKey = `moodify_data_${username}`;
  const raw = localStorage.getItem(userKey);
  if (!raw) {
    clearReminderTimer();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const enabled = Boolean(parsed.notificationsEnabled);
    const reminderTime = parsed.reminderAt || '20:00';
    if (!enabled) {
      clearReminderTimer();
      return;
    }
    if (!('Notification' in window)) {
      clearReminderTimer();
      return;
    }
    if (Notification.permission === 'default') {
      await requestNotificationPermission();
    }
    if (Notification.permission !== 'granted') {
      clearReminderTimer();
      return;
    }
    scheduleReminder(username, reminderTime);
  } catch {
    clearReminderTimer();
  }
};

export const stopDailyReminder = () => {
  clearReminderTimer();
};
