import { OpenAI } from 'openai';
import { ChatMessage, Block } from './types';
import * as interop from './interop';
import * as link from './link';
import * as chat from './chat';

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

async function linkPaper(uuid: string, content: string, _includeRating: boolean): Promise<void> {
  const rawUrl = content.trim();
  const host = link.hostOf(rawUrl);
  
  if (link.knownHost(host)) {
    const url = link.ensureWebUrl(rawUrl);
    const paperInfo = await link.paperInfoOf(url);
    const currentFormat = await interop.getCurrentFormat();
    const userFormat = await interop.getUserFormat();
    const format = currentFormat || userFormat;
    const newContent = link.formatLink(paperInfo.title, url, format);
    
    await interop.updateBlock(uuid, newContent);
    await interop.insertBlock(uuid, paperInfo.abstract, { focus: false });
    await interop.setBlockCollapsed(uuid, { flag: true });
  } else {
    console.log(`${DEV_MSG} | unknown host ${host}`);
  }
}

async function aLink(includeRating: boolean): Promise<void> {
  const currentBlock = await interop.getCurrentBlock();
  const currentUuid = currentBlock.uuid;
  const currentContent = await interop.getEditingBlockContent();
  await linkPaper(currentUuid, currentContent, includeRating);
}

async function aLinks(includeRating: boolean): Promise<void> {
  const currentBlock = await interop.getCurrentBlock({ includeChildren: true });
  const childBlocks = currentBlock.children || [];
  
  for (const childBlock of childBlocks) {
    await linkPaper(childBlock.uuid, childBlock.content, includeRating);
  }
}

async function chatBlock(
  client: OpenAI,
  messages: ChatMessage[],
  model: string,
  stream: boolean,
  newBlock: Block
): Promise<void> {
  if (interop.settingOf('debugPrompts')) {
    console.log('---');
    console.log(messages.map(msg => `${msg.role}:\n${msg.content}`).join('\n\n'));
    console.log('---');
  }
  
  const uuid = newBlock.uuid;
  
  if (stream) {
    const start = Date.now();
    const maxStreamElapsed = interop.settingOf('maxStreamElapsed') || 60;
    let content = newBlock.content;
    
    try {
      for await (const chunk of interop.chatCompletionsCreateStream(client, messages, model)) {
        const elapsed = (Date.now() - start) / 1000;
        
        if (elapsed < maxStreamElapsed) {
          const deltaContent = chat.getDeltaContent(chunk);
          content += deltaContent;
          const finishReason = chunk.choices[0]?.finish_reason;
          
          await interop.updateBlock(uuid, content, { focus: false });
          
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
      const response = await interop.chatCompletionsCreate(client, messages, model);
      const content = newBlock.content;
      const messageContent = chat.getMessageContent(response);
      const newContent = content + messageContent;
      await interop.updateBlock(uuid, newContent, { focus: false });
    } catch (error) {
      console.error('Chat completion error:', error);
      logseq.App.showMsg('Error in chat completion', 'error');
    }
  }
}

function customModelOrModel(): string {
  const customModel = interop.settingOf('customModel');
  const model = interop.settingOf('model');
  return model === 'custom-model' ? (customModel || 'gpt-3.5-turbo') : model;
}

async function aAsk(): Promise<void> {
  const baseUrl = interop.settingOf('baseURL');
  const apiKey = interop.settingOf('apiKey');
  const client = interop.newClient(baseUrl, apiKey);
  const systemMessage = interop.settingOf('systemMessage');
  const currentFormat = await interop.getCurrentFormat();
  const userFormat = await interop.getUserFormat();
  const format = currentFormat || userFormat;
  const augmentedSystemMessage = chat.augmentSystemMessage(systemMessage, format);
  const currentBlock = await interop.getCurrentBlock();
  const currentUuid = currentBlock.uuid;
  const currentContent = await interop.getEditingBlockContent();
  const messages: ChatMessage[] = [
    { role: 'system', content: augmentedSystemMessage },
    { role: 'user', content: currentContent }
  ];
  const model = customModelOrModel();
  const stream = interop.settingOf('stream');
  const newContent = chat.prependPropertyStr(format, model, '\n');
  const newBlock = await interop.insertBlock(currentUuid, newContent, { focus: false });
  
  await chatBlock(client, messages, model, stream, newBlock);
  
  if (interop.settingOf('autoNewBlock')) {
    const nextSibling = await interop.getNextSiblingBlock(currentUuid);
    if (!nextSibling) {
      await interop.insertBlock(currentUuid, '', { sibling: true });
    }
  }
}

async function aChat(): Promise<void> {
  const baseUrl = interop.settingOf('baseURL');
  const apiKey = interop.settingOf('apiKey');
  const client = interop.newClient(baseUrl, apiKey);
  const systemMessage = interop.settingOf('systemMessage');
  const currentFormat = await interop.getCurrentFormat();
  const userFormat = await interop.getUserFormat();
  const format = currentFormat || userFormat;
  const augmentedSystemMessage = chat.augmentSystemMessage(systemMessage, format);
  const currentBlock = await interop.getCurrentBlock();
  const currentUuid = currentBlock.uuid;
  const currentContent = await interop.getEditingBlockContent();
  const parentId = currentBlock.parent?.id;
  
  if (!parentId) {
    console.error('No parent block found');
    return;
  }
  
  const parentBlock = await interop.getBlock(parentId, { includeChildren: true });
  const parentContent = parentBlock.content;
  const parentMessages: ChatMessage[] = [
    { role: 'system', content: augmentedSystemMessage },
    { role: 'user', content: parentContent }
  ];
  
  const childMessages = (parentBlock.children || []).map(childBlock =>
    chat.childBlockToMessage(childBlock, format, currentUuid, currentContent)
  );
  
  const messages = [...parentMessages, ...childMessages];
  const model = customModelOrModel();
  const stream = interop.settingOf('stream');
  const newContent = chat.prependPropertyStr(format, model, '\n');
  const parentUuid = parentBlock.uuid;
  const newBlock = await interop.insertBlock(parentUuid, newContent, { focus: false });
  const newUuid = newBlock.uuid;
  
  await chatBlock(client, messages, model, stream, newBlock);
  
  if (interop.settingOf('autoNewBlock')) {
    const nextSibling = await interop.getNextSiblingBlock(newUuid);
    if (!nextSibling) {
      await interop.insertBlock(newUuid, '', { sibling: true });
    }
  }
}

async function aDev(): Promise<void> {
  const currentBlock = await interop.getCurrentBlock();
  const currentUuid = currentBlock.uuid;
  const properties = await interop.getBlockProperties(currentUuid);
  const chatseqModel = await interop.getBlockProperty(currentUuid, 'chatseq-model');
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
  
  const userName = interop.settingOf('userName');
  const greeting = userName 
    ? `Hello ${userName}---Greeting from Logent!`
    : 'Hello from Logent!';
  logseq.App.showMsg(greeting);
}

// Bootstrap - exactly like the hello-world sample
logseq.ready(main).catch(console.error);