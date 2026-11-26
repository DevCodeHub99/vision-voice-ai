export enum Task {
  DESCRIBE = 'describe',
  READ = 'read',
}

export interface LanguageOption {
  code: string;
  name: string;
}

export type AnalysisResult =
  | { success: true; text: string }
  | { success: false; error: string };

export type AIProvider = 'openrouter' | 'gemini' | 'groq' | 'rapidrouter';

export type ProviderModelsMap = Partial<Record<AIProvider, string>>;

export interface UserSettings {
  provider: AIProvider;
  openRouterKey: string;
  geminiKey: string;
  groqKey?: string;
  rapidRouterKey?: string;
  model: string;
  providerModels?: ProviderModelsMap;
  rememberKey: boolean;
  speechRate?: number;
}
