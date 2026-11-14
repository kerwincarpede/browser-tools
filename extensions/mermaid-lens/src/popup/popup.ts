import {
  ENHANCER_FILES,
  PALETTE,
  THEME_LABELS,
  isBuiltInHost,
  isSiteEnabled,
  loadSettings,
  saveSettings,
  setSiteEnabled,
  watchSettings,
  type Settings,
  type ThemeChoice,
} from '../shared/settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function main() {
  $('version').textContent = `v${chrome.runtime.getManifest().version}`;
  let settings = await loadSettings();

  // ---------------------------------------------------------------- site switch
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ? new URL(tab.url) : null;
  const siteToggle = $<HTMLButtonElement>('site-toggle');
  const runOnce = $<HTMLButtonElement>('run-once');
  const usable = !!url && /^https?:$/.test(url.protocol);
  const host = usable ? url!.hostname : '';
  const pattern = usable ? `${url!.protocol}//${host}/*` : '';
  let hasAccess = usable && (isBuiltInHost(host) || (await chrome.permissions.contains({ origins: [pattern] })));
  const badge = tab?.id !== undefined ? await chrome.action.getBadgeText({ tabId: tab.id }).catch(() => '') : '';

  const renderSite = () => {
    const on = hasAccess && isSiteEnabled(settings, host);
    siteToggle.setAttribute('aria-checked', String(on));
    siteToggle.disabled = !usable;
    $('site-name').textContent = usable ? host : 'This page';
    const count = Number(badge);
    $('site-status').textContent = !usable
      ? 'Mermaid Lens can’t run on this page'
      : !hasAccess
        ? 'Off — turn on to enhance diagrams here'
        : !on
          ? 'Switched off for this site'
          : count > 0
            ? `${count} diagram${count === 1 ? '' : 's'} enhanced on this page`
            : 'On — diagrams will be enhanced';
    runOnce.hidden = !usable || hasAccess;
  };
  renderSite();

  siteToggle.addEventListener('click', async () => {
    if (!usable || tab?.id === undefined) return;
    const turningOn = siteToggle.getAttribute('aria-checked') !== 'true';
    if (turningOn && !hasAccess) {
      // Must be the first await in the click handler to keep the user gesture.
      const granted = await chrome.permissions.request({ origins: [pattern] });
      if (!granted) return;
      hasAccess = true;
      await setSiteEnabled(host, true);
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['detector.js'] }).catch(() => {});
    } else {
      await setSiteEnabled(host, turningOn);
    }
    settings = await loadSettings();
    renderSite();
  });

  runOnce.addEventListener('click', async () => {
    if (tab?.id === undefined) return;
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ENHANCER_FILES }).catch(() => {});
    window.close();
  });

  // ---------------------------------------------------------------- preferences
  const swatches = $('swatches');
  for (const c of PALETTE) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.color = c;
    b.setAttribute('aria-label', `Highlight colour ${c}`);
    b.style.setProperty('--c', c);
    b.addEventListener('click', () => void saveSettings({ highlightColor: c }));
    swatches.append(b);
  }
  const custom = $<HTMLInputElement>('custom-color');
  custom.addEventListener('change', () => void saveSettings({ highlightColor: custom.value }));

  document.querySelectorAll<HTMLElement>('.seg').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('button[data-val]');
      if (b) void saveSettings({ [seg.dataset.key!]: b.dataset.val } as Partial<Settings>);
    });
  });

  const flow = $<HTMLButtonElement>('flow-toggle');
  flow.addEventListener('click', () => void saveSettings({ flowAnimation: !settings.flowAnimation }));

  const theme = $<HTMLSelectElement>('theme');
  for (const [value, label] of Object.entries(THEME_LABELS)) theme.add(new Option(label, value));
  theme.addEventListener('change', () => void saveSettings({ theme: theme.value as ThemeChoice }));

  const renderPrefs = () => {
    document.querySelectorAll<HTMLElement>('.seg').forEach((seg) => {
      const current = String(settings[seg.dataset.key as keyof Settings]);
      seg.querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.val === current)));
    });
    document.querySelector('.seg[data-key="direction"]')!.classList.toggle('disabled', settings.highlightMode === 'off');
    let matched = false;
    swatches.querySelectorAll<HTMLElement>('.swatch').forEach((b) => {
      const on = b.dataset.color!.toLowerCase() === settings.highlightColor.toLowerCase();
      matched ||= on;
      b.setAttribute('aria-checked', String(on));
    });
    const customLabel = custom.parentElement!;
    customLabel.setAttribute('aria-checked', String(!matched));
    customLabel.style.setProperty('--c', settings.highlightColor);
    if (/^#[0-9a-f]{6}$/i.test(settings.highlightColor)) custom.value = settings.highlightColor;
    flow.setAttribute('aria-checked', String(settings.flowAnimation));
    theme.value = settings.theme;
  };
  renderPrefs();

  watchSettings((s) => {
    settings = s;
    renderPrefs();
    renderSite();
  });
}

void main();
