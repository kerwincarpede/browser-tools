export type HighlightMode = 'neighbors' | 'flow';
export type Direction = 'both' | 'down' | 'up';
export type ThemeChoice = 'auto' | 'default' | 'neutral' | 'forest' | 'dark' | 'neo' | 'neo-dark';

export interface Settings {
  /** Light up a node's connections while hovering it (click pins the highlight). */
  highlight: boolean;
  highlightMode: HighlightMode;
  direction: Direction;
  highlightColor: string;
  flowAnimation: boolean;
  /** Seconds for one cycle of the flowing-edge dashes. */
  flowDuration: number;
  /** Rough length, in seconds, of the build-up replay. */
  buildDuration: number;
  theme: ThemeChoice;
  /** Hostnames where the extension has been switched off. */
  disabledSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  highlight: true,
  highlightMode: 'neighbors',
  direction: 'both',
  highlightColor: '#f59e0b',
  flowAnimation: false,
  flowDuration: 1.5,
  buildDuration: 8,
  theme: 'auto',
  disabledSites: [],
};

/** Slider ranges for the animation timing settings (seconds). */
export const TIMING = {
  flowDuration: { min: 0.2, max: 3, step: 0.1 },
  buildDuration: { min: 1, max: 10, step: 0.2 },
} as const;

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
  const merged = { ...DEFAULT_SETTINGS, ...stored } as Settings;
  // Before the on/off switch existed, "off" was a highlight mode.
  if ((merged.highlightMode as string) === 'off') {
    merged.highlight = typeof stored.highlight === 'boolean' ? stored.highlight : false;
    merged.highlightMode = DEFAULT_SETTINGS.highlightMode;
  }
  return merged;
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
export const ENHANCER_FILES = ['vendor/mermaid.min.js', 'vendor/mermaid-zenuml.min.js', 'enhancer.js'];

export const MERMAID_SOURCE_SELECTOR = [
  'pre[lang="mermaid"]',
  'pre[data-language="mermaid"]',
  'pre.mermaid',
  'code.language-mermaid',
  'div.language-mermaid pre',
  'div.mermaid:not([data-processed])',
].join(',');

export const MERMAID_SVG_SELECTOR = [
  'svg[id*="mermaid" i][aria-roledescription]',
  '[class*="mermaid" i] svg[aria-roledescription]',
].join(',');

/** Selector that cheaply tells us a page probably has a Mermaid diagram. */
export const DIAGRAM_HINT_SELECTOR = [
  'section[data-type="mermaid"]',
  MERMAID_SOURCE_SELECTOR,
  MERMAID_SVG_SELECTOR,
].join(',');

/** Messages exchanged between the content scripts, popup and service worker. */
export type Message =
  | { type: 'ml:inject' }
  | { type: 'ml:status'; count: number; enabled: boolean };
