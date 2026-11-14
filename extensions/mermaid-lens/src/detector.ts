/**
 * Lightweight content script. Watches the page for anything that looks like a
 * Mermaid diagram and only then asks the service worker to inject the full
 * enhancer (which bundles Mermaid itself and is several MB).
 */
import { DIAGRAM_HINT_SELECTOR, isSiteEnabled, loadSettings, watchSettings, type Message } from './shared/settings';

declare global {
  interface Window {
    __mermaidLensDetector?: boolean;
    __mermaidLens?: unknown;
  }
}

if (!window.__mermaidLensDetector) {
  window.__mermaidLensDetector = true;
  void start();
}

async function start() {
  const host = location.hostname;
  let enabled = isSiteEnabled(await loadSettings(), host);
  let requested = false;
  let timer = 0;

  const send = (msg: Message) => chrome.runtime.sendMessage(msg).catch(() => {});

  const check = () => {
    timer = 0;
    if (requested || window.__mermaidLens) return;
    if (!document.querySelector(DIAGRAM_HINT_SELECTOR)) return;
    if (!enabled) {
      send({ type: 'ml:status', count: 0, enabled: false });
      return;
    }
    requested = true;
    observer.disconnect();
    chrome.runtime
      .sendMessage<Message, { ok: boolean; error?: string } | undefined>({ type: 'ml:inject' })
      .then((res) => {
        if (res?.ok) return;
        throw new Error(res?.error ?? 'no response from service worker');
      })
      .catch((err) => {
        // Let a later DOM change (or settings change) try again instead of giving up for good.
        console.warn('[Mermaid Lens] could not load the enhancer:', err);
        requested = false;
        observer.observe(document.documentElement, { childList: true, subtree: true });
      });
  };

  const observer = new MutationObserver(() => {
    if (!timer) timer = window.setTimeout(check, 250);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  check();

  watchSettings((s) => {
    const next = isSiteEnabled(s, host);
    if (next === enabled) return;
    enabled = next;
    // Once injected, the enhancer handles enable/disable itself.
    if (enabled && !requested) check();
  });
}
