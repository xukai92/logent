import { describe, it, expect } from 'vitest';
import * as link from '../main/link';

// function takeLeadingChars(n: number, s: string): string {
//   return s.slice(0, n);
// }

describe('link module', () => {
  describe('hostOf', () => {
    it('should extract host from URLs', () => {
      expect(link.hostOf('https://arxiv.org/abs/2104.05134')).toBe('arxiv.org');
      expect(link.hostOf('https://openreview.net/pdf?id=SJg7spEYDS')).toBe('openreview.net');
      expect(link.hostOf('https://xuk.ai')).toBe('xuk.ai');
    });
  });

  describe('knownHost', () => {
    it('should identify known hosts', () => {
      expect(link.knownHost('arxiv.org')).toBe(true);
      expect(link.knownHost('openreview.net')).toBe(true);
      expect(link.knownHost('xuk.ai')).toBe(false);
    });
  });

  describe('ensureWebUrl', () => {
    it('should convert PDF URLs to web URLs', () => {
      expect(link.ensureWebUrl('https://arxiv.org/abs/2104.05134')).toBe('https://arxiv.org/abs/2104.05134');
      expect(link.ensureWebUrl('https://arxiv.org/pdf/2104.05134.pdf')).toBe('https://arxiv.org/abs/2104.05134');
      expect(link.ensureWebUrl('https://openreview.net/pdf?id=SJg7spEYDS')).toBe('https://openreview.net/forum?id=SJg7spEYDS');
      expect(link.ensureWebUrl('https://openreview.net/forum?id=SJg7spEYDS')).toBe('https://openreview.net/forum?id=SJg7spEYDS');
    });
  });

  describe('knownFormat', () => {
    it('should identify known formats', () => {
      expect(link.knownFormat('markdown')).toBe(true);
      expect(link.knownFormat('org')).toBe(true);
      expect(link.knownFormat('html')).toBe(false);
    });
  });

  describe('formatLink', () => {
    it('should format links correctly', () => {
      expect(link.formatLink('Test Title', 'https://example.com', 'markdown')).toBe('[Test Title](https://example.com)');
      expect(link.formatLink('Test Title', 'https://example.com', 'org')).toBe('[[https://example.com][Test Title]]');
    });

    it('should throw error for unknown format', () => {
      expect(() => link.formatLink('Test', 'https://example.com', 'html')).toThrow('Unknown format: html');
    });
  });

  // Note: paperInfoOf tests are commented out as they require network requests
  // which should be mocked in a real test environment
  /*
  describe('paperInfoOf', () => {
    it('should fetch paper info from arxiv', async () => {
      const info = await link.paperInfoOf('https://arxiv.org/abs/2104.05134');
      expect(info.title).toBe('Couplings for Multinomial Hamiltonian Monte Carlo');
      expect(takeLeadingChars(32, info.abstract)).toBe('Hamiltonian Monte Carlo (HMC) is');
    });

    it('should fetch paper info from openreview', async () => {
      const info = await link.paperInfoOf('https://openreview.net/forum?id=SJg7spEYDS');
      expect(info.title).toBe('Generative Ratio Matching Networks');
      expect(takeLeadingChars(32, info.abstract)).toBe('Deep generative models can learn');
    });
  });
  */
});