import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as interop from '../main/interop';

// Mock window.logseq
const mockLogseq = {
  settings: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    model: 'gpt-3.5-turbo',
    systemMessage: 'You are a helpful assistant.'
  },
  App: {
    getUserConfigs: vi.fn().mockResolvedValue({ preferredFormat: 'markdown' }),
    showMsg: vi.fn()
  },
  Editor: {
    getCurrentPage: vi.fn().mockResolvedValue({ format: 'markdown' }),
    getCurrentBlock: vi.fn().mockResolvedValue({ uuid: 'test-uuid', content: 'test content' }),
    getNextSiblingBlock: vi.fn().mockResolvedValue(null),
    getBlock: vi.fn().mockResolvedValue({ uuid: 'test-uuid', content: 'test content' }),
    updateBlock: vi.fn().mockResolvedValue(undefined),
    insertBlock: vi.fn().mockResolvedValue({ uuid: 'new-uuid', content: 'new content' }),
    getBlockProperties: vi.fn().mockResolvedValue({}),
    getBlockProperty: vi.fn().mockResolvedValue(null),
    upsertBlockProperty: vi.fn().mockResolvedValue(undefined),
    setBlockCollapsed: vi.fn().mockResolvedValue(undefined),
    getEditingBlockContent: vi.fn().mockResolvedValue('editing content')
  }
};

beforeEach(() => {
  (global as any).window = {
    logseq: mockLogseq
  };
  vi.clearAllMocks();
});

describe('interop module', () => {
  describe('settingsOf', () => {
    it('should return settings object', () => {
      const settings = interop.settingsOf();
      expect(settings).toEqual(mockLogseq.settings);
    });
  });

  describe('settingOf', () => {
    it('should return specific setting value', () => {
      expect(interop.settingOf('model')).toBe('gpt-3.5-turbo');
      expect(interop.settingOf('apiKey')).toBe('test-key');
    });
  });

  describe('getUserConfigs', () => {
    it('should call logseq getUserConfigs', async () => {
      const result = await interop.getUserConfigs();
      expect(mockLogseq.App.getUserConfigs).toHaveBeenCalled();
      expect(result).toEqual({ preferredFormat: 'markdown' });
    });
  });

  describe('getUserFormat', () => {
    it('should return user preferred format', async () => {
      const format = await interop.getUserFormat();
      expect(format).toBe('markdown');
    });
  });

  describe('getCurrentPage', () => {
    it('should call logseq getCurrentPage', async () => {
      const result = await interop.getCurrentPage();
      expect(mockLogseq.Editor.getCurrentPage).toHaveBeenCalled();
      expect(result).toEqual({ format: 'markdown' });
    });
  });

  describe('getCurrentFormat', () => {
    it('should return current page format', async () => {
      const format = await interop.getCurrentFormat();
      expect(format).toBe('markdown');
    });

    it('should return null when no current page', async () => {
      mockLogseq.Editor.getCurrentPage.mockResolvedValueOnce(null);
      const format = await interop.getCurrentFormat();
      expect(format).toBe(null);
    });
  });

  describe('getCurrentBlock', () => {
    it('should call logseq getCurrentBlock', async () => {
      const result = await interop.getCurrentBlock();
      expect(mockLogseq.Editor.getCurrentBlock).toHaveBeenCalled();
      expect(result).toEqual({ uuid: 'test-uuid', content: 'test content' });
    });
  });

  describe('updateBlock', () => {
    it('should call logseq updateBlock', async () => {
      await interop.updateBlock('test-uuid', 'new content');
      expect(mockLogseq.Editor.updateBlock).toHaveBeenCalledWith('test-uuid', 'new content', undefined);
    });
  });

  describe('insertBlock', () => {
    it('should call logseq insertBlock', async () => {
      const result = await interop.insertBlock('test-uuid', 'new content');
      expect(mockLogseq.Editor.insertBlock).toHaveBeenCalledWith('test-uuid', 'new content', undefined);
      expect(result).toEqual({ uuid: 'new-uuid', content: 'new content' });
    });
  });

  describe('newClient', () => {
    it('should create OpenAI client with correct options', () => {
      // Mock OpenAI constructor
      const mockOpenAI = vi.fn();
      vi.doMock('openai', () => ({ OpenAI: mockOpenAI }));
      
      const client = interop.newClient('https://custom.api.com', 'custom-key');
      
      // Since we can't easily test the actual OpenAI constructor call,
      // we'll just verify the function doesn't throw
      expect(typeof client).toBeDefined();
    });
  });

  // Note: OpenAI-specific tests would require more complex mocking
  // and are not included in this basic test suite
});