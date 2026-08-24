import { json } from '../_lib/db.js';

const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-oss-120b';
const GEMINI_MODEL = 'gemini-3.6-flash';
const CHAT_REFERENCES = '\n\nReferensi:\n- Kemenkes RI, Pedoman Gizi Seimbang\n- WHO, Guideline: Sugars intake for adults and children\n- USDA FoodData Central';

const normalizeMessagesText = (messages) => messages.map((message) => {
  if (typeof message.content === 'string') return `${message.role}: ${message.content}`;
  if (Array.isArray(message.content)) return `${message.role}: ${message.content.map((part) => part.text || '').join('\n')}`;
  return `${message.role}: ${String(message.content ?? '')}`;
}).join('\n\n');

const callGemini = async ({ messages, max_tokens = 800 }) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  const systemMessage = messages.find((message) => message.role === 'system')?.content || 'Kamu adalah SugarSense AI, asisten gizi minuman yang akurat dan kontekstual.';
  const conversation = messages.filter((message) => message.role !== 'system').map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(message.content || '') }]
  }));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: String(systemMessage) }] },
      contents: conversation,
      generationConfig: { maxOutputTokens: Math.max(max_tokens, 800) }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Gemini API error');
  const content = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
  if (!content) throw new Error('Gemini tidak mengembalikan teks.');
  return { ok: true, content: `${content}${content.toLowerCase().includes('referensi:') ? '' : CHAT_REFERENCES}`, model: GEMINI_MODEL };
};

const callCerebras = async ({ messages, max_tokens = 800, model = DEFAULT_MODEL }) => {
  const apiKey = process.env.CEREBRAS_API_KEY || process.env.VITE_CEREBRAS_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(CEREBRAS_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || data?.message || 'Cerebras API error');
  const content = data?.choices?.[0]?.message?.content || '';
  return { ok: true, content: `${content}${content.toLowerCase().includes('referensi:') ? '' : CHAT_REFERENCES}`, model: data?.model || model };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const { messages, max_tokens = 800, model = DEFAULT_MODEL } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) return json(res, 400, { ok: false, error: 'messages wajib diisi' });
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const result = await callGemini({ messages, max_tokens });
        if (result?.ok) return json(res, 200, result);
      } catch (error) { console.warn('Gemini failed, falling back to Cerebras:', error.message); }
    }
    const cerebrasResult = await callCerebras({ messages, max_tokens, model });
    if (cerebrasResult?.ok) return json(res, 200, cerebrasResult);
    return json(res, 503, { ok: false, error: 'Tidak ada provider AI yang aktif.' });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Chat proxy failed' });
  }
}
