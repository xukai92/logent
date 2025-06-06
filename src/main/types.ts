export interface Settings {
  baseURL?: string;
  apiKey?: string;
  model: 'gpt-3.5-turbo' | 'gpt-4-turbo' | 'gpt-4-vision-preview' | 'custom-model';
  customModel?: string;
  stream: boolean;
  maxStreamElapsed: number;
  systemMessage: string;
  autoNewBlock: boolean;
  debugPrompts: boolean;
  userName?: string;
}

export interface PaperInfo {
  title: string;
  abstract: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Block {
  uuid: string;
  content: string;
  properties?: Record<string, any>;
  parent?: { id: string };
  children?: Block[];
}

export interface OpenAIResponse {
  choices: Array<{
    message?: {
      content: string;
    };
    delta?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

// Declare logseq global
declare global {
  const logseq: any;
}