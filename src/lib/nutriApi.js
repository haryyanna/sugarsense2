const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const buildUrl = (path) => `${API_BASE}${path}`;

const request = async (path, { method = 'GET', body } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
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

export const chatCompletion = async ({ messages, max_tokens = 600, temperature = 0.7 }) => {
  return request('/api/chat/completions', {
    method: 'POST',
    body: { messages, max_tokens, temperature }
  });
};

export const analyzeDrinkImage = async ({ imageB64, searchHint, drinkKey }) => {
  return request('/api/fatsecret/analyze', {
    method: 'POST',
    body: { image_b64: imageB64, search_hint: searchHint, drink_key: drinkKey }
  });
};

export const searchDrinks = async (query) => {
  return request(`/api/fatsecret/search?q=${encodeURIComponent(query)}`);
};
