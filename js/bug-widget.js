function buildMailto(body) {
  const subject = encodeURIComponent('VTS Hero Tool - Bug Report');
  return `mailto:aboroe1097@gmail.com?subject=${subject}&body=${encodeURIComponent(body)}`;
}

async function captureScreenshot() {
  const loader = window.loadHtml2Canvas;
  if (typeof loader !== 'function') return null;
  const html2canvas = await loader();
  if (!html2canvas) return null;
  const canvas = await html2canvas(document.body, {
    useCORS: true,
    backgroundColor: null,
    scale: Math.min(2, window.devicePixelRatio || 1),
    ignoreElements: (el) => el.id === 'bugReportWidget',
  });
  return canvas.toDataURL('image/png');
}

export function initBugReportWidget() {
  if (document.documentElement.dataset.bugWidgetWired === '1') return;
  document.documentElement.dataset.bugWidgetWired = '1';

  const widget = document.createElement('div');
  widget.id = 'bugReportWidget';
  widget.className = 'bug-report-widget';
  widget.innerHTML = `
    <button type="button" class="bug-report-fab" aria-label="Report a bug" title="Report a bug">Bug</button>
    <section class="bug-report-panel hidden" aria-label="Bug report">
      <button type="button" class="bug-report-close" aria-label="Close">X</button>
      <h3>Report a bug</h3>
      <textarea placeholder="What happened?"></textarea>
      <div class="bug-report-actions">
        <button type="button" data-bug-shot>Capture</button>
        <button type="button" data-bug-send>Send Email</button>
      </div>
      <img alt="Screenshot preview" class="hidden">
    </section>`;
  document.body.appendChild(widget);

  const panel = widget.querySelector('.bug-report-panel');
  const textarea = widget.querySelector('textarea');
  const preview = widget.querySelector('img');
  let screenshotDataUrl = '';

  widget.querySelector('.bug-report-fab')?.addEventListener('click', () => panel?.classList.toggle('hidden'));
  widget.querySelector('.bug-report-close')?.addEventListener('click', () => panel?.classList.add('hidden'));
  widget.querySelector('[data-bug-shot]')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Capturing...';
    try {
      screenshotDataUrl = await captureScreenshot();
      if (screenshotDataUrl && preview) {
        preview.src = screenshotDataUrl;
        preview.classList.remove('hidden');
      }
      if (typeof window.showToast === 'function') {
        window.showToast(screenshotDataUrl ? 'Screenshot captured.' : 'Screenshot capture unavailable.', screenshotDataUrl ? 'success' : 'error');
      }
    } catch (err) {
      console.warn('Screenshot capture failed:', err);
      if (typeof window.showToast === 'function') window.showToast('Screenshot capture failed.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Capture';
    }
  });
  widget.querySelector('[data-bug-send]')?.addEventListener('click', () => {
    const body = [
      'Bug or issue:',
      textarea?.value || '',
      '',
      `Page: ${location.href}`,
      `User agent: ${navigator.userAgent}`,
      screenshotDataUrl ? 'Screenshot was captured in the widget preview. Attach it if your mail app supports image paste.' : 'No screenshot captured.',
    ].join('\n');
    location.href = buildMailto(body);
  });
}
