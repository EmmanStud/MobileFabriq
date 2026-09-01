/**
 * meshyService.js
 * Handles gown generation via our own backend, which proxies Meshy Text→3D.
 * The Meshy API key never lives in this app — see backend gownDesignerController.js
 */
import { fetchAPI } from './apiConfig';
import { sessionService } from './sessionService';

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
 * Submit a Text→3D generation task via our backend
 * Returns the task ID
 */
export const submitGownGeneration = async (prompt) => {
  const session = await sessionService.getSession();
  const response = await fetchAPI('/gown-designer/generate', {
    method: 'POST',
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gown generation submit failed: ${response.status} — ${err}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Gown generation submit failed');
  return data.taskId;
};

/**
 * Poll our backend for task status until succeeded or failed
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

  const session = await sessionService.getSession();

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    const response = await fetchAPI(`/gown-designer/status/${taskId}`, {
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
    });

    if (!response.ok) throw new Error(`Gown generation status check failed: ${response.status}`);

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Gown generation status check failed');

    const percent = data.progress ?? Math.min((i / MAX_POLLS) * 95, 95);
    const message = progressMessages[Math.floor(i / 8) % progressMessages.length];

    if (onProgress) onProgress(Math.round(percent), message);

    if (data.status === 'SUCCEEDED') {
      return {
        modelUrl: data.modelUrl,
        thumbnailUrl: data.thumbnailUrl,
        taskId,
      };
    }

    if (data.status === 'FAILED' || data.status === 'EXPIRED') {
      throw new Error(`Gown generation failed: ${data.errorMessage || 'Unknown error'}`);
    }
  }

  throw new Error('Gown generation timed out after 5 minutes.');
};