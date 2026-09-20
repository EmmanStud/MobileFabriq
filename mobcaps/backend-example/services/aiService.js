const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class ProviderLimitError extends Error {
  constructor(provider, message) {
    super(message);
    this.name = 'ProviderLimitError';
    this.provider = provider;
  }
}

const isProviderLimit = (status, body) => {
  if ([402, 403, 429].includes(status)) return true;
  const text = JSON.stringify(body || '').toLowerCase();
  return text.includes('quota') || text.includes('rate limit') || text.includes('resource exhausted');
};

const readResponse = async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `AI provider returned ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
};

const askGemini = async (messages) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const contents = messages
    .filter(({ role }) => role !== 'system')
    .map(({ role, content }) => ({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }],
    }));
  const systemInstruction = messages.find(({ role }) => role === 'system');
  const payload = {
    contents,
    ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction.content }] } }),
    generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
  };

  const response = await fetch(
    `${GEMINI_API_URL}/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  try {
    const body = await readResponse(response);
    return body.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
  } catch (error) {
    if (isProviderLimit(error.status, error.body)) {
      throw new ProviderLimitError('gemini', error.message);
    }
    throw error;
  }
};

const askGroq = async (messages) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const body = await readResponse(response);
  return body.choices?.[0]?.message?.content?.trim() || '';
};

const askGeminiVision = async ({ image, mimeType, prompt }) => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  const response = await fetch(
    `${GEMINI_API_URL}/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }, { inlineData: { mimeType, data: image } }],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800, responseMimeType: 'application/json' },
      }),
    },
  );

  try {
    const body = await readResponse(response);
    return body.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
  } catch (error) {
    if (isProviderLimit(error.status, error.body)) throw new ProviderLimitError('gemini', error.message);
    throw error;
  }
};

const askGroqVision = async ({ image, mimeType, prompt }) => {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } },
      ] }],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  });
  const body = await readResponse(response);
  return body.choices?.[0]?.message?.content?.trim() || '';
};

const parseJson = (text) => {
  const cleaned = String(text || '').replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
};

const analyzeImage = async ({ image, mimeType = 'image/jpeg', prompt }) => {
  try {
    return { result: parseJson(await askGeminiVision({ image, mimeType, prompt })), provider: 'gemini' };
  } catch (error) {
    if (error instanceof ProviderLimitError || !process.env.GEMINI_API_KEY) {
      console.warn('Gemini vision unavailable; using Groq fallback:', error.message);
      return { result: parseJson(await askGroqVision({ image, mimeType, prompt })), provider: 'groq' };
    }
    throw error;
  }
};

const generateReply = async ({ userQuery }) => {
  const messages = [
    {
      role: 'system',
      content: 'You are the helpful customer service assistant for Hannah Vanessa Boutique. Answer briefly and warmly. For orders, rentals, payments, or account-specific issues, ask the customer to contact the boutique team rather than inventing details.',
    },
    { role: 'user', content: userQuery },
  ];

  try {
    const text = await askGemini(messages);
    return { text, provider: 'gemini' };
  } catch (error) {
    if (!(error instanceof ProviderLimitError) && process.env.GEMINI_API_KEY) {
      throw error;
    }

    if (error instanceof ProviderLimitError) {
      console.warn('Gemini limit reached; using Groq fallback.');
    } else {
      console.warn('Gemini unavailable; using Groq fallback:', error.message);
    }

    const text = await askGroq(messages);
    return { text, provider: 'groq' };
  }
};

module.exports = { generateReply, analyzeImage, ProviderLimitError };