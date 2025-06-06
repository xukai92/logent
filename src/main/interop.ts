import { OpenAI } from 'openai';
import { Settings, ChatMessage, Block, OpenAIResponse } from './types';

// Logseq interop functions

export function settingsOf(): Settings {
  return logseq.settings as Settings;
}

export function settingOf<K extends keyof Settings>(key: K): Settings[K] {
  return settingsOf()[key];
}

export async function getUserConfigs(): Promise<Record<string, any>> {
  return await logseq.App.getUserConfigs();
}

export async function getUserFormat(): Promise<string> {
  const configs = await getUserConfigs();
  return configs.preferredFormat;
}

export async function getCurrentPage(): Promise<any> {
  return await logseq.Editor.getCurrentPage();
}

export async function getCurrentFormat(): Promise<string | null> {
  const currentPage = await getCurrentPage();
  return currentPage ? currentPage.format : null;
}

export async function getCurrentBlock(options?: any): Promise<Block> {
  return await logseq.Editor.getCurrentBlock(options);
}

export async function getNextSiblingBlock(uuid: string): Promise<Block | null> {
  return await logseq.Editor.getNextSiblingBlock(uuid);
}

export async function getBlock(uuid: string, options?: any): Promise<Block> {
  return await logseq.Editor.getBlock(uuid, options);
}

export async function updateBlock(uuid: string, content: string, options?: any): Promise<void> {
  return await logseq.Editor.updateBlock(uuid, content, options);
}

export async function insertBlock(uuid: string, content: string, options?: any): Promise<Block> {
  return await logseq.Editor.insertBlock(uuid, content, options);
}

export async function getBlockProperties(uuid: string): Promise<Record<string, any>> {
  return await logseq.Editor.getBlockProperties(uuid);
}

export async function getBlockProperty(uuid: string, key: string): Promise<any> {
  return await logseq.Editor.getBlockProperty(uuid, key);
}

export async function upsertBlockProperty(uuid: string, key: string, value: any): Promise<void> {
  return await logseq.Editor.upsertBlockProperty(uuid, key, value);
}

export async function setBlockCollapsed(uuid: string, options: { flag: boolean }): Promise<void> {
  return await logseq.Editor.setBlockCollapsed(uuid, options);
}

export async function getEditingBlockContent(): Promise<string> {
  return await logseq.Editor.getEditingBlockContent();
}

// OpenAI interop functions

export function newClient(baseURL?: string, apiKey?: string): OpenAI {
  const options: any = {
    apiKey,
    dangerouslyAllowBrowser: true
  };
  
  if (baseURL) {
    options.baseURL = baseURL;
  }
  
  return new OpenAI(options);
}

export async function* chatCompletionsCreateStream(
  client: OpenAI,
  messages: ChatMessage[],
  model: string
): AsyncGenerator<OpenAIResponse, void, unknown> {
  const stream = await client.chat.completions.create({
    messages: messages as any,
    model,
    stream: true
  });

  for await (const chunk of stream) {
    yield chunk as OpenAIResponse;
  }
}

export async function chatCompletionsCreate(
  client: OpenAI,
  messages: ChatMessage[],
  model: string
): Promise<OpenAIResponse> {
  const response = await client.chat.completions.create({
    messages: messages as any,
    model,
    stream: false
  });
  
  return response as OpenAIResponse;
}