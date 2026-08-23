const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const NEON_ENABLED = (import.meta.env.VITE_NEON_ENABLED || 'true').toLowerCase() !== 'false';

const buildUrl = (path) => `${API_BASE}${path}`;

const request = async (path, { method = 'GET', body } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(buildUrl(path), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

export const isNeonEnabled = () => NEON_ENABLED;

export const ensureNeonUser = async (username) => {
  if (!NEON_ENABLED || !username) return null;
  const data = await request('/api/users/ensure', {
    method: 'POST',
    body: { username }
  });
  return data?.user || null;
};

export const createNeonCheckin = async ({ username, mood, sadness, anxiety, stress, journal, createdAt }) => {
  if (!NEON_ENABLED) return { ok: false, error: 'Neon disabled' };
  return request('/api/checkins/create', {
    method: 'POST',
    body: { username, mood, sadness, anxiety, stress, journal, createdAt }
  });
};

export const hasNeonCheckinToday = async (username) => {
  if (!NEON_ENABLED || !username) return false;
  const data = await request(`/api/checkins/has-today?username=${encodeURIComponent(username)}`);
  return Boolean(data?.hasToday);
};

export const listNeonAdminUsers = async () => {
  if (!NEON_ENABLED) return [];
  const data = await request('/api/admin/users');
  return Array.isArray(data?.users) ? data.users : [];
};

export const deleteNeonUser = async (username) => {
  if (!NEON_ENABLED) throw new Error('Neon disabled');
  return request('/api/admin/delete-user', {
    method: 'POST',
    body: { username }
  });
};

export const listNeonCommunityPosts = async () => {
  if (!NEON_ENABLED) return [];
  const data = await request('/api/community/list');
  return Array.isArray(data?.posts) ? data.posts : [];
};

export const createNeonCommunityPost = async ({ authorName, content }) => {
  if (!NEON_ENABLED) throw new Error('Neon disabled');
  return request('/api/community/create', {
    method: 'POST',
    body: { authorName, content }
  });
};

export const updateNeonCommunityPost = async ({ postId, authorName, content }) => {
  if (!NEON_ENABLED) throw new Error('Neon disabled');
  return request('/api/community/update', {
    method: 'POST',
    body: { postId, authorName, content }
  });
};

export const deleteNeonCommunityPost = async ({ postId, authorName }) => {
  if (!NEON_ENABLED) throw new Error('Neon disabled');
  return request('/api/community/delete', {
    method: 'POST',
    body: { postId, authorName }
  });
};

export const likeNeonCommunityPost = async ({ postId, likes }) => {
  if (!NEON_ENABLED) throw new Error('Neon disabled');
  return request('/api/community/like', {
    method: 'POST',
    body: { postId, likes }
  });
};
