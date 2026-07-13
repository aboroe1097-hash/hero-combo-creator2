const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:']);

export function escapeAiHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSafeAiUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return SAFE_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function renderInline(source) {
  const placeholders = [];
  const hold = (html) => {
    const token = `\u0000AI${placeholders.length}\u0000`;
    placeholders.push(html);
    return token;
  };

  let text = String(source || '');
  text = text.replace(/`([^`\n]+)`/g, (_match, code) =>
    hold(`<code class="ai-inline-code" dir="ltr" translate="no">${escapeAiHtml(code)}</code>`)
  );
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, label) => escapeAiHtml(label));
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, label, href) => {
    const safeLabel = escapeAiHtml(label);
    if (!isSafeAiUrl(href)) return safeLabel;
    return hold(
      `<a href="${escapeAiHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${safeLabel}</a>`
    );
  });
  text = escapeAiHtml(text);
  text = text
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
  placeholders.forEach((html, index) => {
    text = text.replace(`\u0000AI${index}\u0000`, html);
  });
  return text;
}

function renderTextBlock(block) {
  const lines = block.split('\n');
  const unordered = lines.every((line) => /^\s*[-*+]\s+/.test(line));
  if (unordered) {
    return `<ul>${lines
      .map((line) => `<li>${renderInline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`)
      .join('')}</ul>`;
  }
  const ordered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));
  if (ordered) {
    return `<ol>${lines
      .map((line) => `<li>${renderInline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>`)
      .join('')}</ol>`;
  }
  return `<p>${lines.map(renderInline).join('<br>')}</p>`;
}

export function renderSafeMarkdown(markdown, options = {}) {
  const copyLabel = escapeAiHtml(options.copyLabel || 'Copy');
  const copiedLabel = escapeAiHtml(options.copiedLabel || 'Copied');
  const input = String(markdown || '').replace(/\r\n?/g, '\n');
  const blocks = [];
  let cursor = 0;
  const fence = /```([\w.+-]{0,24})[^\n]*\n([\s\S]*?)(?:```|$)/g;
  let match;
  while ((match = fence.exec(input))) {
    const before = input.slice(cursor, match.index);
    before
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .forEach((block) => blocks.push(renderTextBlock(block)));
    const language = match[1] || 'text';
    blocks.push(
      `<div class="ai-code-block" dir="ltr"><div class="ai-code-toolbar"><span>${escapeAiHtml(language)}</span><button type="button" class="ai-copy-code" data-copy-label="${copyLabel}" data-copied-label="${copiedLabel}">${copyLabel}</button></div><pre tabindex="0" dir="ltr" translate="no"><code>${escapeAiHtml(match[2].replace(/\n$/, ''))}</code></pre></div>`
    );
    cursor = fence.lastIndex;
  }
  input
    .slice(cursor)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .forEach((block) => blocks.push(renderTextBlock(block)));
  return blocks.join('');
}

export function installCodeCopyHandlers(
  container,
  writeText = (text) => navigator.clipboard.writeText(text)
) {
  container?.querySelectorAll?.('.ai-copy-code').forEach((button) => {
    if (button.dataset.copyWired === '1') return;
    button.dataset.copyWired = '1';
    button.addEventListener('click', async () => {
      const code = button.closest('.ai-code-block')?.querySelector('code')?.textContent || '';
      try {
        await writeText(code);
        button.textContent = button.dataset.copiedLabel || 'Copied';
        setTimeout(() => {
          button.textContent = button.dataset.copyLabel || 'Copy';
        }, 1400);
      } catch {
        button.textContent = button.dataset.copyLabel || 'Copy';
      }
    });
  });
}
