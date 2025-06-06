import { PaperInfo } from './types';

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function knownHost(host: string): boolean {
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

export function ensureWebUrl(url: string): string {
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

export async function paperInfoOf(url: string): Promise<PaperInfo> {
  const host = hostOf(url);
  const domTree = await getDomTree(url);
  const titleContent = titleContentOf(domTree);
  const title = cleanTitleContent(host, titleContent);
  const abstract = abstractContentOf(host, domTree);
  
  return { title, abstract };
}

export function knownFormat(format: string): boolean {
  return ['markdown', 'org'].includes(format);
}

export function formatLink(title: string, link: string, format: string): string {
  if (!knownFormat(format)) {
    throw new Error(`Unknown format: ${format}`);
  }
  
  switch (format) {
    case 'markdown':
      return `[${title}](${link})`;
    case 'org':
      return `[[${link}][${title}]]`;
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}