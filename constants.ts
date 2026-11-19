import { LanguageOption, Task } from './types';

export const LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English' },
  { code: 'hi-IN', name: 'हिन्दी' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'pt-BR', name: 'Português' },
];

export const PROMPT_TEMPLATES: Record<Task, string> = {
  [Task.DESCRIBE]: 'Describe the key elements of this image for a visually impaired person. Keep the description crisp, direct, and concise (2 to 3 sentences max). State the main subject and any critical safety details, obstacles, or hazards immediately. Do not use filler introductory phrases.',
  [Task.READ]: 'Extract all visible text from this image accurately. Output only the extracted text without any preamble, explanation, or conversational filler. If no text is present, respond with "No text detected in image."',
};

export const AI_SYSTEM_INSTRUCTION = 'You are a crisp, direct visual aid assistant for visually impaired users. Give immediate, clear, to-the-point descriptions without conversational fluff or introductory chatter.';

export interface ModelPreset {
  id: string;
  name: string;
  description?: string;
  badge?: string;
}

export const OPENROUTER_PRESET_MODELS: ModelPreset[] = [
  { 
    id: 'openrouter/free', 
    name: 'OpenRouter Auto Free (Recommended)', 
    description: 'Auto-routes to the best active healthy free vision model (Zero Cost)', 
    badge: 'Recommended' 
  },
  { 
    id: 'inclusionai/ling-3.2-flash:free', 
    name: 'inclusionAI Ling 3.2 Flash (Fast Free)', 
    description: 'High-speed vision-language model with rapid OCR and scene narration', 
    badge: 'Fast' 
  },
  { 
    id: 'google/gemma-4-31b-it:free', 
    name: 'Google Gemma 4 31B Vision', 
    description: 'DeepMind open multimodal vision model with high-resolution image reasoning', 
    badge: 'High Res' 
  },
  { 
    id: 'google/gemma-4-26b-a4b-it:free', 
    name: 'Google Gemma 4 26B Vision', 
    description: 'Fast multimodal vision model optimized for continuous visual assistance', 
    badge: 'Multimodal' 
  },
  { 
    id: 'custom', 
    name: 'Custom OpenRouter Model...', 
    description: 'Enter any valid OpenRouter multimodal model ID (must end in :free for zero cost)' 
  }
];

export const GEMINI_PRESET_MODELS: ModelPreset[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)', description: 'Best balance of vision accuracy, speed, and safety', badge: 'Popular' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Fast)', description: 'Ultra-fast low-latency vision responses', badge: 'Fast' },
  { id: 'custom', name: 'Custom Gemini Model...', description: 'Enter any valid Google AI Studio model ID' }
];

export const DEFAULT_OPENROUTER_CASCADE = OPENROUTER_PRESET_MODELS
  .filter(m => m.id !== 'custom')
  .map(m => m.id);

export const DEFAULT_GEMINI_CASCADE = GEMINI_PRESET_MODELS
  .filter(m => m.id !== 'custom')
  .map(m => m.id);
