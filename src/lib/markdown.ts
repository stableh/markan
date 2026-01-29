export const stripMarkdown = (markdown: string) => {
  let text = markdown;

  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  text = text.replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  text = text.replace(/~~([^~]+)~~/g, '$1');

  return text;
};

const PARAGRAPH_BREAK = '\u0000';

export const toPlainDisplay = (markdown: string) => {
  let text = markdown.replace(/\r\n/g, '\n');
  text = text.replace(/\n{2,}/g, PARAGRAPH_BREAK);
  text = text.replace(/\n/g, ' ');
  text = text.replace(new RegExp(PARAGRAPH_BREAK, 'g'), '\n');
  return text;
};

export const fromPlainDisplay = (displayText: string) => {
  let text = displayText.replace(/\r\n/g, '\n');
  text = text.replace(/\n+/g, '\n\n');
  return text;
};
