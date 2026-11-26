import { AIProvider, LanguageOption, Task } from './types';

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
    description: 'Auto-routes to the best active healthy free vision model (Zero Cost, No Card)',
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
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'NVIDIA Nemotron 3.5 Super VL (Free)',
    description: 'Multimodal vision-language model for detailed scene & document analysis',
    badge: 'Vision'
  },
  {
    id: 'custom',
    name: 'Custom OpenRouter Model...',
    description: 'Enter any valid OpenRouter multimodal model ID (use :free for zero cost)'
  }
];

export const GEMINI_PRESET_MODELS: ModelPreset[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Recommended)',
    description: 'High-intelligence multimodal Flash model with free-tier availability on Google AI Studio (No Card)',
    badge: 'Popular'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite (Fast)',
    description: 'Stable ultra-low-latency multimodal vision responses on the Google AI Studio free tier',
    badge: 'Fast'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Legacy)',
    description: 'Legacy compatibility alias (auto-routes to newer Flash tiers)',
    badge: 'Legacy'
  },
  {
    id: 'custom',
    name: 'Custom Gemini Model...',
    description: 'Enter any valid Google AI Studio multimodal model ID'
  }
];

export const GROQ_PRESET_MODELS: ModelPreset[] = [
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B Vision (Recommended)',
    description: 'Active 27B multimodal model with strong OCR & scene narration on Groq LPU free tier (No Card)',
    badge: 'Recommended'
  },
  {
    id: 'meta-models/muse-spark-open',
    name: 'Muse Spark Open Vision (Preview)',
    description: 'Meta MoE multimodal reasoning model with image support on Groq (limited preview)',
    badge: 'Preview'
  },
  {
    id: 'custom',
    name: 'Custom Groq Model...',
    description: 'Enter any valid Groq multimodal vision model ID'
  }
];

export const RAPIDROUTER_PRESET_MODELS: ModelPreset[] = [
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B Vision (Free)',
    description: 'Zero-cost DeepMind multimodal vision model on Rapid Router free tier (50 req/day, No Card)',
    badge: 'Recommended'
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Google Gemma 4 26B Vision (Fast Free)',
    description: 'Fast zero-cost multimodal model on Rapid Router free tier ($0 balance supported)',
    badge: 'Fast'
  },
  {
    id: 'custom',
    name: 'Custom Rapid Router Model...',
    description: 'Enter any Rapid Router vision model ID (use :free models for $0 balance)'
  }
];

export const DEFAULT_OPENROUTER_CASCADE = OPENROUTER_PRESET_MODELS
  .filter(m => m.id !== 'custom')
  .map(m => m.id);

export const DEFAULT_GEMINI_CASCADE = GEMINI_PRESET_MODELS
  .filter(m => m.id !== 'custom')
  .map(m => m.id);

export const DEFAULT_GROQ_CASCADE = GROQ_PRESET_MODELS
  .filter(m => m.id !== 'custom')
  .map(m => m.id);

export const DEFAULT_RAPIDROUTER_CASCADE = RAPIDROUTER_PRESET_MODELS
  .filter(m => m.id !== 'custom')
  .map(m => m.id);

export const PROVIDER_ORDER: AIProvider[] = ['gemini', 'openrouter', 'groq', 'rapidrouter'];

export const PROVIDER_PRESET_MODELS: Record<AIProvider, ModelPreset[]> = {
  gemini: GEMINI_PRESET_MODELS,
  openrouter: OPENROUTER_PRESET_MODELS,
  groq: GROQ_PRESET_MODELS,
  rapidrouter: RAPIDROUTER_PRESET_MODELS,
};

export const PROVIDER_DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: DEFAULT_GEMINI_CASCADE[0],
  openrouter: DEFAULT_OPENROUTER_CASCADE[0],
  groq: DEFAULT_GROQ_CASCADE[0],
  rapidrouter: DEFAULT_RAPIDROUTER_CASCADE[0],
};

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  rapidrouter: 'Rapid Router',
};
