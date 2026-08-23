const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_BASE = 'https://platform.fatsecret.com/rest';

let cachedToken = null;
let tokenExpiresAt = 0;

const getCredentials = () => {
  const clientId = process.env.FATSECRET_CLIENT_ID || '';
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET || '';
  return { clientId, clientSecret };
};

export const isFatSecretConfigured = () => {
  const { clientId, clientSecret } = getCredentials();
  return Boolean(clientId && clientSecret);
};

// Akun Basic hanya memiliki scope `basic`. Localization adalah fitur premium,
// jadi hanya diminta jika variabel server berikut diaktifkan setelah disetujui FatSecret.
const hasLocalization = () => process.env.FATSECRET_USE_LOCALIZATION === 'true';
const apiScope = (extra = '') => ['basic', hasLocalization() ? 'localization' : '', extra].filter(Boolean).join(' ');

export const getAccessToken = async (scope = apiScope()) => {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { clientId, clientSecret } = getCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('FatSecret API belum dikonfigurasi. Tambahkan FATSECRET_CLIENT_ID dan FATSECRET_CLIENT_SECRET.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Gagal mendapatkan token FatSecret');
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 86400) * 1000;
  return cachedToken;
};

const fatSecretFetch = async (path, { method = 'GET', body, scope } = {}) => {
  const token = await getAccessToken(scope);
  const url = method === 'GET'
    ? `${API_BASE}${path}${path.includes('?') ? '&' : '?'}format=json`
    : `${API_BASE}${path}?format=json`;
  const isFormRequest = method !== 'GET';

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': isFormRequest ? 'application/x-www-form-urlencoded' : 'application/json' } : {})
    },
    body: body ? (isFormRequest ? new URLSearchParams(body) : JSON.stringify(body)) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (data.error) {
    throw new Error(data.error.message || `FatSecret error ${data.error.code}`);
  }
  return data;
};

export const searchFoods = async (query, { region = 'ID', language = 'id', maxResults = 10 } = {}) => {
  const params = new URLSearchParams({
    search_expression: query,
    max_results: String(Math.min(maxResults, 20)),
    page_number: '0'
  });
  if (hasLocalization()) { params.set('region', region); params.set('language', language); }

  const data = await fatSecretFetch(`/foods/search/v5?${params}`, {
    scope: apiScope()
  });

  const foods = data?.foods?.food;
  if (!foods) return [];
  return Array.isArray(foods) ? foods : [foods];
};

export const getFoodById = async (foodId, { region = 'ID', language = 'id' } = {}) => {
  const params = new URLSearchParams({ food_id: String(foodId) });
  if (hasLocalization()) { params.set('region', region); params.set('language', language); }
  const data = await fatSecretFetch(`/food/v4?${params}`, {
    scope: apiScope()
  });
  return data?.food || null;
};

export const recognizeImage = async (imageB64, { region = 'ID', language = 'id' } = {}) => {
  const cleanB64 = imageB64.replace(/^data:image\/\w+;base64,/, '');
  const data = await fatSecretFetch('/image-recognition/v2', {
    method: 'POST',
    scope: apiScope(),
    body: {
      image_b64: cleanB64,
      include_food_data: true,
      ...(hasLocalization() ? { region, language } : {})
    }
  });

  const items = data?.food_response;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
};

const pickPrimaryServing = (food) => {
  const servings = food?.servings?.serving;
  if (!servings) return null;
  const list = Array.isArray(servings) ? servings : [servings];
  return list.find((s) => s.is_default === '1') || list[0] || null;
};

export const parseServingNutrition = (serving) => {
  if (!serving) return null;
  const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  return {
    calories: num(serving.calories),
    sugar: num(serving.sugar),
    fat: num(serving.fat),
    protein: num(serving.protein),
    carbs: num(serving.carbohydrate),
    fiber: num(serving.fiber),
    sodium: num(serving.sodium),
    servingDescription: serving.serving_description || serving.measurement_description || '1 porsi'
  };
};

export const foodToNutritionResult = (food, source = 'fatsecret') => {
  const serving = pickPrimaryServing(food);
  const nutrition = parseServingNutrition(serving);
  if (!nutrition) return null;

  const sugarPercent = Math.round((nutrition.sugar / 50) * 100);
  const grade = computeNutriGrade(nutrition);

  return {
    id: food.food_id,
    name: food.food_name + (food.brand_name ? ` (${food.brand_name})` : ''),
    category: food.food_type === 'Brand' ? 'Minuman Kemasan' : 'Minuman',
    grade: grade.letter,
    gradeColor: grade.color,
    calories: Math.round(nutrition.calories),
    sugar: Math.round(nutrition.sugar * 10) / 10,
    sugarPercent,
    fat: Math.round(nutrition.fat * 10) / 10,
    protein: Math.round(nutrition.protein * 10) / 10,
    status: grade.status,
    emoji: '🥤',
    source,
    servingDescription: nutrition.servingDescription,
    nutritionList: buildNutritionList(nutrition),
    tips: buildTips(nutrition, food.food_name)
  };
};

export const recognizedFoodToResult = (item) => {
  const food = item.food || item;
  const eaten = item.eaten?.total_nutritional_content;
  if (eaten) {
    const nutrition = {
      calories: parseFloat(eaten.calories) || 0,
      sugar: parseFloat(eaten.sugar) || 0,
      fat: parseFloat(eaten.fat) || 0,
      protein: parseFloat(eaten.protein) || 0,
      carbs: parseFloat(eaten.carbohydrate) || 0,
      fiber: parseFloat(eaten.fiber) || 0,
      sodium: parseFloat(eaten.sodium) || 0,
      servingDescription: item.suggested_serving?.serving_description || '1 porsi'
    };
    const grade = computeNutriGrade(nutrition);
    return {
      id: item.food_id || food.food_id,
      name: item.food_entry_name || food.food_name,
      category: 'Minuman Teridentifikasi',
      grade: grade.letter,
      gradeColor: grade.color,
      calories: Math.round(nutrition.calories),
      sugar: Math.round(nutrition.sugar * 10) / 10,
      sugarPercent: Math.round((nutrition.sugar / 50) * 100),
      fat: Math.round(nutrition.fat * 10) / 10,
      protein: Math.round(nutrition.protein * 10) / 10,
      status: grade.status,
      emoji: '🥤',
      source: 'fatsecret-image',
      servingDescription: nutrition.servingDescription,
      nutritionList: buildNutritionList(nutrition),
      tips: buildTips(nutrition, item.food_entry_name || food.food_name)
    };
  }
  return foodToNutritionResult(food, 'fatsecret-image');
};

const computeNutriGrade = ({ sugar, calories, fat }) => {
  if (sugar <= 5 && calories <= 80) {
    return { letter: 'A', color: '#10b981', status: 'Sangat Sehat' };
  }
  if (sugar <= 12 && calories <= 150) {
    return { letter: 'B', color: '#84cc16', status: 'Cukup Sehat' };
  }
  if (sugar <= 25 && calories <= 250) {
    return { letter: 'C', color: '#eab308', status: 'Gula Sedang' };
  }
  if (sugar <= 35) {
    return { letter: 'D', color: '#f97316', status: 'Tinggi Gula & Kalori' };
  }
  return { letter: 'E', color: '#ef4444', status: 'Sangat Tinggi Gula!' };
};

const buildNutritionList = (n) => [
  { label: 'Kalori', value: `${Math.round(n.calories)} kkal`, desc: n.calories > 200 ? 'Tinggi' : n.calories > 100 ? 'Sedang' : 'Rendah' },
  { label: 'Gula', value: `${Math.round(n.sugar * 10) / 10} gram`, desc: n.sugar > 25 ? 'Sangat Tinggi' : n.sugar > 12 ? 'Sedang-Tinggi' : 'Rendah' },
  { label: 'Lemak', value: `${Math.round(n.fat * 10) / 10} gram`, desc: n.fat > 10 ? 'Tinggi' : 'Sedang' },
  { label: 'Protein', value: `${Math.round(n.protein * 10) / 10} gram`, desc: n.protein > 5 ? 'Baik' : 'Rendah' }
];

const buildTips = (n, name) => {
  if (n.sugar > 30) {
    return `${name} mengandung gula tinggi (~${Math.round(n.sugar)}g). Batas harian Kemenkes RI 50g. Pertimbangkan ukuran lebih kecil atau kurangi gula.`;
  }
  if (n.sugar <= 5) {
    return `${name} relatif rendah gula. Pilihan bagus untuk hidrasi sehari-hari!`;
  }
  return `${name} mengandung ~${Math.round(n.calories)} kkal dan ${Math.round(n.sugar)}g gula per porsi. Konsumsi secukupnya ya!`;
};
