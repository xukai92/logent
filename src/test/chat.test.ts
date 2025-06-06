import { describe, it, expect, beforeEach } from 'vitest';
import * as chat from '../main/chat';
import { Block, OpenAIResponse } from '../main/types';

// Mock window.logseq
const mockLogseq = {
  settings: {
    systemMessage: 'You are a helpful assistant.'
  }
};

beforeEach(() => {
  (global as any).window = {
    logseq: mockLogseq
  };
});

describe('chat module', () => {
  describe('augmentSystemMessage', () => {
    it('should augment system message with markdown format instructions', () => {
      const systemMessage = 'You are a helpful assistant.';
      const result = chat.augmentSystemMessage(systemMessage, 'markdown');
      expect(result).toContain(systemMessage);
      expect(result).toContain('Markdown syntax');
      expect(result).toContain('Use `*` for lists instead of `-`');
    });

    it('should augment system message with org format instructions', () => {
      const systemMessage = 'You are a helpful assistant.';
      const result = chat.augmentSystemMessage(systemMessage, 'org');
      expect(result).toContain(systemMessage);
      expect(result).toContain('Org mode syntax');
      expect(result).toContain('*bold*');
    });

    it('should return original message for unknown format', () => {
      const systemMessage = 'You are a helpful assistant.';
      const result = chat.augmentSystemMessage(systemMessage, 'unknown');
      expect(result).toBe(systemMessage);
    });
  });

  describe('prependPropertyStr', () => {
    it('should prepend markdown property string', () => {
      const result = chat.prependPropertyStr('markdown', 'gpt-4', '\nContent');
      expect(result).toBe('chatseq-model:: gpt-4\nContent');
    });

    it('should prepend org property string', () => {
      const result = chat.prependPropertyStr('org', 'gpt-4', '\nContent');
      expect(result).toBe(':PROPERTIES:\n:chatseq-model: gpt-4\n:END:\nContent');
    });

    it('should return original string for unknown format', () => {
      const result = chat.prependPropertyStr('unknown', 'gpt-4', '\nContent');
      expect(result).toBe('\nContent');
    });
  });

  describe('removePropertyStr', () => {
    it('should remove markdown property string', () => {
      const input = 'chatseq-model:: gpt-4\nActual content';
      const result = chat.removePropertyStr('markdown', input);
      expect(result).toBe('Actual content');
    });

    it('should remove org property string', () => {
      const input = ':PROPERTIES:\n:chatseq-model: gpt-4\n:END:\nActual content';
      const result = chat.removePropertyStr('org', input);
      expect(result).toBe('Actual content');
    });

    it('should return original string for unknown format', () => {
      const input = 'Some content';
      const result = chat.removePropertyStr('unknown', input);
      expect(result).toBe(input);
    });
  });

  describe('getMessageContent', () => {
    it('should extract message content from response', () => {
      const response: OpenAIResponse = {
        choices: [{
          message: {
            content: 'Hello world'
          }
        }]
      };
      
      expect(chat.getMessageContent(response)).toBe('Hello world');
    });

    it('should return empty string for missing content', () => {
      const response: OpenAIResponse = {
        choices: [{}]
      };
      
      expect(chat.getMessageContent(response)).toBe('');
    });
  });

  describe('getDeltaContent', () => {
    it('should extract delta content from chunk', () => {
      const chunk: OpenAIResponse = {
        choices: [{
          delta: {
            content: 'Hello'
          }
        }]
      };
      
      expect(chat.getDeltaContent(chunk)).toBe('Hello');
    });

    it('should return empty string for missing delta content', () => {
      const chunk: OpenAIResponse = {
        choices: [{}]
      };
      
      expect(chat.getDeltaContent(chunk)).toBe('');
    });
  });

  describe('childBlockToMessage', () => {
    it('should convert assistant block to message', () => {
      const block: Block = {
        uuid: 'test-uuid',
        content: 'chatseq-model:: gpt-4\nAssistant response',
        properties: { chatseqModel: 'gpt-4' }
      };
      
      const result = chat.childBlockToMessage(block, 'markdown', 'current-uuid', 'Current content');
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Assistant response');
    });

    it('should convert current user block to message', () => {
      const block: Block = {
        uuid: 'current-uuid',
        content: 'Original content'
      };
      
      const result = chat.childBlockToMessage(block, 'markdown', 'current-uuid', 'Current editing content');
      expect(result.role).toBe('user');
      expect(result.content).toBe('Current editing content');
    });

    it('should convert other user block to message', () => {
      const block: Block = {
        uuid: 'other-uuid',
        content: 'Other user content'
      };
      
      const result = chat.childBlockToMessage(block, 'markdown', 'current-uuid', 'Current content');
      expect(result.role).toBe('user');
      expect(result.content).toBe('Other user content');
    });
  });
});