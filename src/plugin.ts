// OpenAI will be loaded via script tag

// Types
interface Settings {
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

interface PaperInfo {
  title: string;
  abstract: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Block {
  uuid: string;
  content: string;
  properties?: Record<string, any>;
  parent?: { id: string };
  children?: Block[];
}

interface OpenAIResponse {
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
declare const logseq: any;

// Constants
const DEV_MSG = 'dev log';

const SETTINGS_SCHEMA = [
  {
    key: 'baseURL',
    type: 'string',
    title: 'API URL',
    description: 'The URL for an OpenAI-compatible API (defaults to OpenAI\'s API).',
    default: null
  },
  {
    key: 'apiKey',
    type: 'string',
    title: 'API Key',
    description: 'Authentication key; for OpenAI\'s, see https://platform.openai.com/api-keys.',
    default: null
  },
  {
    key: 'model',
    type: 'enum',
    title: 'Model name',
    description: 'The name of the model to use.',
    enumPicker: 'radio',
    enumChoices: ['gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4-vision-preview', 'custom-model'],
    default: 'gpt-3.5-turbo'
  },
  {
    key: 'customModel',
    type: 'string',
    title: 'Custom model name',
    description: 'The name of the custom model to use.',
    default: null
  },
  {
    key: 'stream',
    type: 'boolean',
    title: 'Stream response',
    description: 'Read response in stream mode?',
    default: false
  },
  {
    key: 'maxStreamElapsed',
    type: 'number',
    title: 'Maximum stream wait time (s)',
    description: 'The maximum time (in seconds) to wait when reading stream.',
    default: 60
  },
  {
    key: 'systemMessage',
    type: 'string',
    title: 'System message',
    description: 'The system message to start the conversation.',
    default: 'You\'re a helpful & smart assistant. Please provide concise & correct answers.'
  },
  {
    key: 'autoNewBlock',
    type: 'boolean',
    title: 'Automatically add new block',
    description: 'Automatically start in a new block after the bot response?',
    default: true
  },
  {
    key: 'debugPrompts',
    type: 'boolean',
    title: 'Debug prompts',
    description: 'Print prompts in console (CMD-OPT-I) for debugging purposes?',
    default: false
  },
  {
    key: 'userName',
    type: 'string',
    title: 'User name',
    description: 'Your preferred name for Logent to say hello.',
    default: null
  }
];

// Interop functions
function settingsOf(): Settings {
  return logseq.settings as Settings;
}

function settingOf<K extends keyof Settings>(key: K): Settings[K] {
  return settingsOf()[key];
}

async function getUserConfigs(): Promise<Record<string, any>> {
  return await logseq.App.getUserConfigs();
}

async function getUserFormat(): Promise<string> {
  const configs = await getUserConfigs();
  return configs.preferredFormat;
}

async function getCurrentPage(): Promise<any> {
  return await logseq.Editor.getCurrentPage();
}

async function getCurrentFormat(): Promise<string | null> {
  const currentPage = await getCurrentPage();
  return currentPage ? currentPage.format : null;
}

async function getCurrentBlock(options?: any): Promise<Block> {
  return await logseq.Editor.getCurrentBlock(options);
}

async function getNextSiblingBlock(uuid: string): Promise<Block | null> {
  return await logseq.Editor.getNextSiblingBlock(uuid);
}

async function getBlock(uuid: string, options?: any): Promise<Block> {
  return await logseq.Editor.getBlock(uuid, options);
}

async function updateBlock(uuid: string, content: string, options?: any): Promise<void> {
  return await logseq.Editor.updateBlock(uuid, content, options);
}

async function insertBlock(uuid: string, content: string, options?: any): Promise<Block> {
  return await logseq.Editor.insertBlock(uuid, content, options);
}

async function getBlockProperties(uuid: string): Promise<Record<string, any>> {
  return await logseq.Editor.getBlockProperties(uuid);
}

async function getBlockProperty(uuid: string, key: string): Promise<any> {
  return await logseq.Editor.getBlockProperty(uuid, key);
}

async function setBlockCollapsed(uuid: string, options: { flag: boolean }): Promise<void> {
  return await logseq.Editor.setBlockCollapsed(uuid, options);
}

async function getEditingBlockContent(): Promise<string> {
  return await logseq.Editor.getEditingBlockContent();
}

interface OpenAIClient {
  baseURL: string;
  apiKey: string;
}

function newClient(baseURL?: string, apiKey?: string): OpenAIClient {
  return {
    baseURL: baseURL || 'https://api.openai.com/v1',
    apiKey: apiKey || ''
  };
}

async function* chatCompletionsCreateStream(
  client: OpenAIClient,
  messages: ChatMessage[],
  model: string
): AsyncGenerator<OpenAIResponse, void, unknown> {
  const response = await fetch(`${client.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${client.apiKey}`
    },
    body: JSON.stringify({
      messages,
      model,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const chunk = JSON.parse(data);
            yield chunk;
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function chatCompletionsCreate(
  client: OpenAIClient,
  messages: ChatMessage[],
  model: string
): Promise<OpenAIResponse> {
  const response = await fetch(`${client.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${client.apiKey}`
    },
    body: JSON.stringify({
      messages,
      model,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return await response.json();
}

// Chat functions
const FORMAT_INSTRUCTION_MARKDOWN = `Please assist by reading and responding in Markdown syntax used by Logseq's blocks, with the following additional notes:
* Use \`*\` for lists instead of \`-\`.
* Avoid using headings like \`#\`, \`##\`, etc.
* Avoid nesting lists.
* Avoid using sub-items.`;

const FORMAT_INSTRUCTION_ORG = `Please assist by reading and responding in Org mode syntax used by Logseq's blocks, with the following additional notes:
- Markup examples:
  #+BEGIN_SRC org
  *bold*, =verbatim=, /italic/, +strikethrough+, _underline_, ~code~, [[protocal://some.domain][some label]]
  #+END_SRC
- Note that bold uses single ~*~ to quote,, i.e. ~*bold*~ instead of ~**bold**~.
- Avoid using headings.
- Avoid nesting lists.
* Avoid using sub-items.
- Avoid quoting the entire response in a greater block.`;

function augmentSystemMessage(systemMessage: string, format: string): string {
  let formatInstruction: string | null = null;
  
  switch (format) {
    case 'markdown':
      formatInstruction = FORMAT_INSTRUCTION_MARKDOWN;
      break;
    case 'org':
      formatInstruction = FORMAT_INSTRUCTION_ORG;
      break;
    default:
      formatInstruction = null;
  }
  
  return formatInstruction ? `${systemMessage} ${formatInstruction}` : systemMessage;
}

function prependPropertyStr(format: string, model: string, s: string): string {
  let propertyStr: string | null = null;
  
  switch (format) {
    case 'markdown':
      propertyStr = `chatseq-model:: ${model}`;
      break;
    case 'org':
      propertyStr = `:PROPERTIES:\n:chatseq-model: ${model}\n:END:`;
      break;
    default:
      propertyStr = null;
  }
  
  return propertyStr ? propertyStr + s : s;
}

function removePropertyStr(format: string, s: string): string {
  let pattern: RegExp | null = null;
  
  switch (format) {
    case 'markdown':
      pattern = /^chatseq-model:: .+\n/;
      break;
    case 'org':
      pattern = /^:PROPERTIES:\n:chatseq-model: .+\n:END:\n/;
      break;
    default:
      pattern = null;
  }
  
  return pattern ? s.replace(pattern, '') : s;
}

function getMessageContent(response: OpenAIResponse): string {
  return response.choices[0]?.message?.content || '';
}

function getDeltaContent(chunk: OpenAIResponse): string {
  return chunk.choices[0]?.delta?.content || '';
}

function childBlockToMessage(
  childBlock: Block,
  format: string,
  currentUuid: string,
  currentContent: string
): ChatMessage {
  const { uuid, content, properties } = childBlock;
  const propertyValue = properties?.chatseqModel;
  
  if (propertyValue) {
    return {
      role: 'assistant',
      content: removePropertyStr(format, content)
    };
  } else if (uuid === currentUuid) {
    return {
      role: 'user',
      content: currentContent
    };
  } else {
    return {
      role: 'user',
      content
    };
  }
}

// Link functions
function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function knownHost(host: string): boolean {
  return ['arxiv.org', 'openreview.net'].includes(host);
}

function replacementStrFor(host: string): string | null {
  switch (host) {
    case 'arxiv.org':
      return 'abs';
    case 'openreview.net':
      return 'forum';
    default:
      return null;
  }
}

function ensureWebUrl(url: string): string {
  const endsWithPdf = url.endsWith('.pdf');
  const urlWithoutPdf = endsWithPdf ? url.slice(0, -4) : url;
  const replacementStr = replacementStrFor(hostOf(url));
  
  if (!replacementStr) {
    return urlWithoutPdf;
  }
  
  return urlWithoutPdf.replace(/pdf/, replacementStr);
}

async function getDomTree(url: string): Promise<Document> {
  const response = await fetch(url);
  const html = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function titleContentOf(domTree: Document): string {
  const titleElement = domTree.querySelector('title');
  return titleElement?.textContent || '';
}

function abstractContentOf(host: string, domTree: Document): string {
  switch (host) {
    case 'arxiv.org': {
      const abstractElement = domTree.querySelector('.abstract');
      return abstractElement?.innerHTML || '';
    }
    case 'openreview.net': {
      const metaElement = domTree.querySelector('meta[name="citation_abstract"]');
      return metaElement?.getAttribute('content') || '';
    }
    default:
      return '';
  }
}

function cleanTitleContent(host: string, titleContent: string): string {
  switch (host) {
    case 'arxiv.org':
      return titleContent.replace(/^\[(.*?)\]\s/, '');
    case 'openreview.net':
      return titleContent.replace(/\s(\|\sOpenReview)$/, '');
    default:
      return titleContent;
  }
}

async function paperInfoOf(url: string): Promise<PaperInfo> {
  const host = hostOf(url);
  const domTree = await getDomTree(url);
  const titleContent = titleContentOf(domTree);
  const title = cleanTitleContent(host, titleContent);
  const abstract = abstractContentOf(host, domTree);
  
  return { title, abstract };
}

function formatLink(title: string, link: string, format: string): string {
  switch (format) {
    case 'markdown':
      return `[${title}](${link})`;
    case 'org':
      return `[[${link}][${title}]]`;
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

// Main plugin functions
async function linkPaper(uuid: string, content: string, _includeRating: boolean): Promise<void> {
  const rawUrl = content.trim();
  const host = hostOf(rawUrl);
  
  if (knownHost(host)) {
    const url = ensureWebUrl(rawUrl);
    const paperInfo = await paperInfoOf(url);
    const currentFormat = await getCurrentFormat();
    const userFormat = await getUserFormat();
    const format = currentFormat || userFormat;
    const newContent = formatLink(paperInfo.title, url, format);
    
    await updateBlock(uuid, newContent);
    await insertBlock(uuid, paperInfo.abstract, { focus: false });
    await setBlockCollapsed(uuid, { flag: true });
  } else {
    console.log(`${DEV_MSG} | unknown host ${host}`);
  }
}

async function aLink(includeRating: boolean): Promise<void> {
  const currentBlock = await getCurrentBlock();
  const currentUuid = currentBlock.uuid;
  const currentContent = await getEditingBlockContent();
  await linkPaper(currentUuid, currentContent, includeRating);
}

async function aLinks(includeRating: boolean): Promise<void> {
  const currentBlock = await getCurrentBlock({ includeChildren: true });
  const childBlocks = currentBlock.children || [];
  
  for (const childBlock of childBlocks) {
    await linkPaper(childBlock.uuid, childBlock.content, includeRating);
  }
}

async function chatBlock(
  client: OpenAIClient,
  messages: ChatMessage[],
  model: string,
  stream: boolean,
  newBlock: Block
): Promise<void> {
  if (settingOf('debugPrompts')) {
    console.log('---');
    console.log(messages.map(msg => `${msg.role}:\n${msg.content}`).join('\n\n'));
    console.log('---');
  }
  
  const uuid = newBlock.uuid;
  
  if (stream) {
    const start = Date.now();
    const maxStreamElapsed = settingOf('maxStreamElapsed') || 60;
    let content = newBlock.content;
    
    try {
      for await (const chunk of chatCompletionsCreateStream(client, messages, model)) {
        const elapsed = (Date.now() - start) / 1000;
        
        if (elapsed < maxStreamElapsed) {
          const deltaContent = getDeltaContent(chunk);
          content += deltaContent;
          const finishReason = chunk.choices[0]?.finish_reason;
          
          await updateBlock(uuid, content, { focus: false });
          
          if (finishReason) {
            break;
          }
        } else {
          logseq.App.showMsg('Time out when reading response stream!', 'error');
          break;
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      logseq.App.showMsg('Error in stream response', 'error');
    }
  } else {
    try {
      const response = await chatCompletionsCreate(client, messages, model);
      const content = newBlock.content;
      const messageContent = getMessageContent(response);
      const newContent = content + messageContent;
      await updateBlock(uuid, newContent, { focus: false });
    } catch (error) {
      console.error('Chat completion error:', error);
      logseq.App.showMsg('Error in chat completion', 'error');
    }
  }
}

function customModelOrModel(): string {
  const customModel = settingOf('customModel');
  const model = settingOf('model');
  return model === 'custom-model' ? (customModel || 'gpt-3.5-turbo') : model;
}

async function aAsk(): Promise<void> {
  const baseUrl = settingOf('baseURL');
  const apiKey = settingOf('apiKey');
  const client = newClient(baseUrl, apiKey);
  const systemMessage = settingOf('systemMessage');
  const currentFormat = await getCurrentFormat();
  const userFormat = await getUserFormat();
  const format = currentFormat || userFormat;
  const augmentedSystemMessage = augmentSystemMessage(systemMessage, format);
  const currentBlock = await getCurrentBlock();
  const currentUuid = currentBlock.uuid;
  const currentContent = await getEditingBlockContent();
  const messages: ChatMessage[] = [
    { role: 'system', content: augmentedSystemMessage },
    { role: 'user', content: currentContent }
  ];
  const model = customModelOrModel();
  const stream = settingOf('stream');
  const newContent = prependPropertyStr(format, model, '\n');
  const newBlock = await insertBlock(currentUuid, newContent, { focus: false });
  
  await chatBlock(client, messages, model, stream, newBlock);
  
  if (settingOf('autoNewBlock')) {
    const nextSibling = await getNextSiblingBlock(currentUuid);
    if (!nextSibling) {
      await insertBlock(currentUuid, '', { sibling: true });
    }
  }
}

async function aChat(): Promise<void> {
  const baseUrl = settingOf('baseURL');
  const apiKey = settingOf('apiKey');
  const client = newClient(baseUrl, apiKey);
  const systemMessage = settingOf('systemMessage');
  const currentFormat = await getCurrentFormat();
  const userFormat = await getUserFormat();
  const format = currentFormat || userFormat;
  const augmentedSystemMessage = augmentSystemMessage(systemMessage, format);
  const currentBlock = await getCurrentBlock();
  const currentUuid = currentBlock.uuid;
  const currentContent = await getEditingBlockContent();
  const parentId = currentBlock.parent?.id;
  
  if (!parentId) {
    console.error('No parent block found');
    return;
  }
  
  const parentBlock = await getBlock(parentId, { includeChildren: true });
  const parentContent = parentBlock.content;
  const parentMessages: ChatMessage[] = [
    { role: 'system', content: augmentedSystemMessage },
    { role: 'user', content: parentContent }
  ];
  
  const childMessages = (parentBlock.children || []).map(childBlock =>
    childBlockToMessage(childBlock, format, currentUuid, currentContent)
  );
  
  const messages = [...parentMessages, ...childMessages];
  const model = customModelOrModel();
  const stream = settingOf('stream');
  const newContent = prependPropertyStr(format, model, '\n');
  const parentUuid = parentBlock.uuid;
  const newBlock = await insertBlock(parentUuid, newContent, { focus: false });
  const newUuid = newBlock.uuid;
  
  await chatBlock(client, messages, model, stream, newBlock);
  
  if (settingOf('autoNewBlock')) {
    const nextSibling = await getNextSiblingBlock(newUuid);
    if (!nextSibling) {
      await insertBlock(newUuid, '', { sibling: true });
    }
  }
}

async function aDev(): Promise<void> {
  const currentBlock = await getCurrentBlock();
  const currentUuid = currentBlock.uuid;
  const properties = await getBlockProperties(currentUuid);
  const chatseqModel = await getBlockProperty(currentUuid, 'chatseq-model');
  console.log(properties);
  console.log(chatseqModel);
}

function main(): void {
  logseq.useSettingsSchema(SETTINGS_SCHEMA);
  
  logseq.Editor.registerSlashCommand('a-link', () => aLink(false));
  logseq.Editor.registerSlashCommand('a-links', () => aLinks(false));
  logseq.Editor.registerSlashCommand('a-ask', aAsk);
  logseq.Editor.registerSlashCommand('a-chat', aChat);
  logseq.Editor.registerSlashCommand('a-dev', aDev);
  
  const userName = settingOf('userName');
  const greeting = userName 
    ? `Hello ${userName}---Greeting from Logent!`
    : 'Hello from Logent!';
  logseq.App.showMsg(greeting);
}

// Bootstrap - exactly like the hello-world sample
logseq.ready(main).catch(console.error);