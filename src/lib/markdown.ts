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

export const toPlainDisplay = (markdown: string) => {
  // Plain mode shows one visual line break for each markdown paragraph break.
  // Use pairwise replacement to preserve repeated empty lines.
  return markdown.replace(/\r\n/g, '\n').replace(/\n\n/g, '\n');
};

export const fromPlainDisplay = (displayText: string) => {
  // Convert each visual line break back to a markdown paragraph break.
  // This keeps the count of repeated Enter presses.
  return displayText.replace(/\r\n/g, '\n').replace(/\n/g, '\n\n');
};
