/**
 * Enhancer entry point. Injected (together with the Mermaid bundle) by the
 * service worker once the detector has seen a diagram on the page.
 */
import {
  isSiteEnabled,
  loadSettings,
  saveSettings,
  setSiteEnabled,
  watchSettings,
  type Message,
  type Settings,
} from '../shared/settings';
import { findDiagrams } from './sources';
import { DiagramViewer, type ViewerContext } from './viewer';

class MermaidLens {
  private settings!: Settings;
  private enabled = false;
  private viewers = new Map<Element, DiagramViewer>();
  private managed = new Set<Element>();
  private observer?: MutationObserver;
  private scanTimer = 0;
  private themeTimer = 0;
  private reported = '';
  private readonly host = location.hostname;

  private ctx: ViewerContext = {
    settings: () => this.settings,
    update: (patch, persist = true) => {
      this.onSettings({ ...this.settings, ...patch });
      if (persist) void saveSettings(patch);
    },
    disableSite: () => {
      this.setEnabled(false);
      void setSiteEnabled(this.host, false);
    },
    siteName: this.host,
  };

  async init() {
    this.settings = await loadSettings();
    watchSettings((s) => this.onSettings(s));
    this.watchTheme();
    this.setEnabled(isSiteEnabled(this.settings, this.host));
  }

  private onSettings(next: Settings) {
    const prev = this.settings;
    this.settings = next;
    this.setEnabled(isSiteEnabled(next, this.host));
    for (const v of this.viewers.values()) v.applySettings(next, prev);
  }

  private setEnabled(on: boolean) {
    if (on !== this.enabled) {
      this.enabled = on;
      if (on) this.start();
      else this.stop();
    }
    this.report();
  }

  private start() {
    this.observer = new MutationObserver(() => {
      if (!this.scanTimer) this.scanTimer = window.setTimeout(() => this.scan(), 200);
    });
    this.observer.observe(document.body ?? document.documentElement, { childList: true, subtree: true });
    this.scan();
  }

  private stop() {
    this.observer?.disconnect();
    clearTimeout(this.scanTimer);
    this.scanTimer = 0;
    for (const v of this.viewers.values()) v.destroy();
    this.viewers.clear();
    this.managed.clear();
  }

  private scan() {
    this.scanTimer = 0;
    if (!this.enabled) return;

    // Drop viewers whose diagram left the page (SPA navigation, edited comments, ...).
    for (const [anchor, v] of this.viewers) {
      if (v.mounted && (!anchor.isConnected || !v.host.isConnected)) {
        v.destroy();
        this.viewers.delete(anchor);
        this.managed.delete(anchor);
      }
    }
    for (const anchor of this.managed) {
      if (!anchor.isConnected && !this.viewers.has(anchor)) this.managed.delete(anchor);
    }

    for (const source of findDiagrams(this.managed)) {
      const viewer = new DiagramViewer(source, this.ctx);
      this.viewers.set(source.anchor, viewer);
      viewer.mount().then((ok) => {
        // Failed renders stay "managed" so we don't retry them in a loop; the
        // page's own rendering (or error message) remains visible.
        if (!ok || !this.enabled) {
          this.viewers.delete(source.anchor);
          if (ok) viewer.destroy();
        }
        this.report();
      });
    }
    this.report();
  }

  private watchTheme() {
    const refresh = () => {
      clearTimeout(this.themeTimer);
      this.themeTimer = window.setTimeout(() => {
        for (const v of this.viewers.values()) void v.refreshTheme();
      }, 150);
    };
    new MutationObserver(refresh).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-color-mode', 'data-dark-theme', 'data-light-theme', 'data-theme', 'class', 'style'],
    });
    if (document.body) {
      new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    }
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);
  }

  private report() {
    const count = [...this.viewers.values()].filter((v) => v.mounted).length;
    const key = `${this.enabled}:${count}`;
    if (key === this.reported) return;
    this.reported = key;
    const msg: Message = { type: 'ml:status', count, enabled: this.enabled };
    chrome.runtime.sendMessage(msg).catch(() => {});
  }
}

if (!window.__mermaidLens) {
  const lens = new MermaidLens();
  window.__mermaidLens = lens;
  void lens.init();
}
