/**
 * meshyService.js
 * Handles Meshy Text→3D API calls for GownDesigner3D
 * API Docs: https://docs.meshy.ai/api-text-to-3d
 */

const MESHY_API_KEY = process.env.EXPO_PUBLIC_MESHY_API_KEY;
const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v2';

/**
 * Build a descriptive prompt from the user's customization choices
 */
export const buildGownPrompt = (design) => {
  const { silhouette, color, fabric, addOns } = design;

  const addOnNames = addOns.length > 0
    ? addOns.map(a => a.name).join(', ')
    : 'no additional accessories';

  return (
    `An elegant ${silhouette.name} evening gown in ${color.name} ${fabric.name} fabric, ` +
    `with ${addOnNames}, ` +
    `Philippines haute couture fashion, luxury boutique style, ` +
    `full length dress, photorealistic, isolated on white background, ` +
    `no person, dress only, floating upright, high detail fabric texture`
  );
};

/**
 * Submit a Text→3D generation task to Meshy
 * Returns the task ID
 */
export const submitGownGeneration = async (prompt) => {
  const response = await fetch(`${MESHY_BASE_URL}/text-to-3d`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      art_style: 'realistic',
      negative_prompt: 'low quality, blurry, person, body, mannequin, background, ugly',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Meshy submit failed: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.result; // task ID string
};

/**
 * Poll Meshy for task status until succeeded or failed
 * Calls onProgress(percent, message) every poll cycle
 */
export const pollGownTask = async (taskId, onProgress) => {
  const MAX_POLLS = 60; // 60 × 5s = 5 minutes max
  const POLL_INTERVAL = 5000;

  const progressMessages = [
    'Sketching your silhouette...',
    'Draping the fabric...',
    'Adding color and texture...',
    'Sculpting fine details...',
    'Applying accessories...',
    'Finishing touches...',
    'Almost ready...',
  ];

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    const response = await fetch(`${MESHY_BASE_URL}/text-to-3d/${taskId}`, {
      headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` },
    });

    if (!response.ok) throw new Error(`Meshy poll failed: ${response.status}`);

    const data = await response.json();
    const percent = data.progress || Math.min((i / MAX_POLLS) * 95, 95);
    const message = progressMessages[Math.floor(i / 8) % progressMessages.length];

    if (onProgress) onProgress(Math.round(percent), message);

    if (data.status === 'SUCCEEDED') {
      return {
        modelUrl: data.model_urls?.glb || data.model_urls?.obj || null,
        thumbnailUrl: data.thumbnail_url || null,
        taskId,
      };
    }

    if (data.status === 'FAILED' || data.status === 'EXPIRED') {
      throw new Error(`Meshy generation failed: ${data.task_error?.message || 'Unknown error'}`);
    }
  }

  throw new Error('Meshy generation timed out after 5 minutes.');
};