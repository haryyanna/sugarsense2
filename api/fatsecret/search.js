import { json } from '../_lib/db.js';
import { isFatSecretConfigured, searchFoods, getFoodById, foodToNutritionResult } from '../_lib/fatsecret.js';
import { findVerifiedDrink } from '../../src/data/verifiedDrinks.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const query = req.method === 'GET'
    ? req.query?.q
    : req.body?.query;

  if (!query || !String(query).trim()) {
    return json(res, 400, { ok: false, error: 'Query pencarian wajib diisi' });
  }

  try {
    if (isFatSecretConfigured()) {
      const results = await searchFoods(String(query).trim(), { region: 'ID', language: 'id' });
      const detailed = [];

      for (const item of results.slice(0, 5)) {
        try {
          const food = await getFoodById(item.food_id, { region: 'ID', language: 'id' });
          const parsed = foodToNutritionResult(food);
          if (parsed) detailed.push(parsed);
        } catch {
          detailed.push({
            id: item.food_id,
            name: item.food_name + (item.brand_name ? ` (${item.brand_name})` : ''),
            source: 'fatsecret-search'
          });
        }
      }

      if (detailed.length > 0) {
        return json(res, 200, { ok: true, results: detailed, source: 'fatsecret' });
      }
    }

    const local = findVerifiedDrink(String(query).trim());
    if (local) {
      return json(res, 200, { ok: true, results: [local], source: 'verified-local' });
    }

    return json(res, 200, { ok: true, results: [], source: 'none' });
  } catch (error) {
    const local = findVerifiedDrink(String(query).trim());
    if (local) {
      return json(res, 200, { ok: true, results: [local], source: 'verified-local-fallback' });
    }
    return json(res, 500, { ok: false, error: error.message || 'Pencarian gagal' });
  }
}
