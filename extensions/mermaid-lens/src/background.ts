import { BUILT_IN_MATCHES, ENHANCER_FILES, type Message } from './shared/settings';

const EXTRA_SCRIPT_ID = 'mermaid-lens-extra-sites';

/**
 * The detector content script is tiny and runs on every matching page. Only once it
 * finds a Mermaid diagram do we inject the (large) Mermaid bundle and the enhancer.
 */
chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;

  if (msg.type === 'ml:inject') {
    chrome.scripting
      .executeScript({ target: { tabId, frameIds: [sender.frameId ?? 0] }, files: ENHANCER_FILES })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // async response
  }

  if (msg.type === 'ml:status') {
    const text = !msg.enabled ? 'off' : msg.count > 0 ? String(msg.count) : '';
    chrome.action.setBadgeText({ tabId, text }).catch(() => {});
    chrome.action
      .setBadgeBackgroundColor({ tabId, color: msg.enabled ? '#6366f1' : '#6b7280' })
      .catch(() => {});
  }
});

/** Keep a dynamic content script registered for every site the user opted into. */
async function syncExtraSites(): Promise<void> {
  const { origins = [] } = await chrome.permissions.getAll();
  const extra = origins.filter((o) => !BUILT_IN_MATCHES.includes(o));
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [EXTRA_SCRIPT_ID] });

  if (extra.length === 0) {
    if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [EXTRA_SCRIPT_ID] });
    return;
  }
  const script = {
    id: EXTRA_SCRIPT_ID,
    matches: extra,
    js: ['detector.js'],
    runAt: 'document_idle' as const,
    persistAcrossSessions: true,
  };
  if (existing.length) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
}

chrome.runtime.onInstalled.addListener(() => void syncExtraSites());
chrome.runtime.onStartup.addListener(() => void syncExtraSites());
chrome.permissions.onAdded.addListener(() => void syncExtraSites());
chrome.permissions.onRemoved.addListener(() => void syncExtraSites());
