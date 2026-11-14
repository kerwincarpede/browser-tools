export type HighlightMode = 'off' | 'neighbors' | 'flow';
export type Direction = 'both' | 'down' | 'up';
export type ThemeChoice = 'auto' | 'default' | 'neutral' | 'forest' | 'dark' | 'neo' | 'neo-dark';

export interface Settings {
  highlightMode: HighlightMode;
  direction: Direction;
  highlightColor: string;
  flowAnimation: boolean;
  theme: ThemeChoice;
  /** Hostnames where the extension has been switched off. */
  disabledSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  highlightMode: 'neighbors',
  direction: 'both',
  highlightColor: '#f59e0b',
  flowAnimation: false,
  theme: 'auto',
  disabledSites: [],
};

export const PALETTE = ['#f59e0b', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#0ea5e9', '#14b8a6', '#22c55e'];

export const THEME_LABELS: Record<ThemeChoice, string> = {
  auto: 'Match page',
  default: 'Default',
  neutral: 'Neutral',
  forest: 'Forest',
  dark: 'Dark',
  neo: 'Neo',
  'neo-dark': 'Neo dark',
};

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(KEYS);
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export function saveSettings(patch: Partial<Settings>): Promise<void> {
  return chrome.storage.sync.set(patch);
}

/** Calls back with the full, merged settings whenever any of them change. */
export function watchSettings(cb: (s: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !KEYS.some((k) => k in changes)) return;
    loadSettings().then(cb);
  });
}

export function isSiteEnabled(s: Settings, host: string): boolean {
  return !s.disabledSites.includes(host);
}

export async function setSiteEnabled(host: string, enabled: boolean): Promise<void> {
  const { disabledSites } = await loadSettings();
  const next = disabledSites.filter((h) => h !== host);
  if (!enabled) next.push(host);
  await saveSettings({ disabledSites: next });
}

/** Origins whose access ships with the extension (everything else is opt-in per site). */
export const BUILT_IN_MATCHES = ['https://github.com/*', 'https://gist.github.com/*'];

export function isBuiltInHost(host: string): boolean {
  return host === 'github.com' || host === 'gist.github.com';
}

/** Scripts injected (lazily) once a page is known to contain a diagram. */
export const ENHANCER_FILES = ['vendor/mermaid.min.js', 'enhancer.js'];

/** Selector that cheaply tells us a page probably has a Mermaid diagram. */
export const DIAGRAM_HINT_SELECTOR = [
  'section[data-type="mermaid"]',
  'pre[lang="mermaid"]',
  'code.language-mermaid',
  'pre.mermaid',
  'svg[id^="mermaid"][aria-roledescription]',
  '.mermaid svg[aria-roledescription]',
].join(',');

/** Messages exchanged between the content scripts, popup and service worker. */
export type Message =
  | { type: 'ml:inject' }
  | { type: 'ml:status'; count: number; enabled: boolean };
