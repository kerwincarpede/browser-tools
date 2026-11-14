/** 24×24 stroke icons, drawn for this extension. */
const paths = {
  highlight:
    '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="12" cy="18" r="2.6"/><path d="M8.6 6h6.8M7.3 8.3l3.4 7.3M16.7 8.3l-3.4 7.3"/>',
  flow: '<circle cx="5.5" cy="5.5" r="2.4"/><circle cx="12" cy="12" r="2.4"/><circle cx="18.5" cy="18.5" r="2.4"/><path d="M7.3 7.3l2.9 2.9M13.8 13.8l2.9 2.9"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  play: '<path d="M8 5.6v12.8a.6.6 0 0 0 .9.5l10.2-6.4a.6.6 0 0 0 0-1L8.9 5.1a.6.6 0 0 0-.9.5z"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2"/><path d="M15.5 8.5V6.2A2.2 2.2 0 0 0 13.3 4H6.2A2.2 2.2 0 0 0 4 6.2v7.1a2.2 2.2 0 0 0 2.2 2.2h2.3"/>',
  expand: '<path d="M4 9V5.2C4 4.5 4.5 4 5.2 4H9M15 4h3.8c.7 0 1.2.5 1.2 1.2V9M20 15v3.8c0 .7-.5 1.2-1.2 1.2H15M9 20H5.2C4.5 20 4 19.5 4 18.8V15"/>',
  collapse: '<path d="M9 4v3.8C9 8.5 8.5 9 7.8 9H4M20 9h-3.8C15.5 9 15 8.5 15 7.8V4M15 20v-3.8c0-.7.5-1.2 1.2-1.2H20M4 15h3.8c.7 0 1.2.5 1.2 1.2V20"/>',
  more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
  fit: '<path d="M4 8.5V4h4.5M20 8.5V4h-4.5M4 15.5V20h4.5M20 15.5V20h-4.5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.4"/>',
  code: '<path d="M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13.4 5.5l-2.8 13"/>',
  image: '<rect x="4" y="4" width="16" height="16" rx="2.4"/><circle cx="9.2" cy="9.2" r="1.6"/><path d="m20 15.2-4.3-4.3a1.2 1.2 0 0 0-1.7 0L6.5 18.4"/>',
  vector: '<path d="M5 19 12 5l7 14"/><circle cx="12" cy="5" r="1.8"/><circle cx="5" cy="19" r="1.8"/><circle cx="19" cy="19" r="1.8"/><path d="M7.5 14.5h9"/>',
  download: '<path d="M12 4.5v10.5M7.5 10.8 12 15.3l4.5-4.5M5 19.5h14"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.8c0 .7-.5 1.2-1.2 1.2H5.2C4.5 20 4 19.5 4 18.8V7.2C4 6.5 4.5 6 5.2 6H10"/>',
  power: '<path d="M12 4v7.5M7.2 6.9a7 7 0 1 0 9.6 0"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 8.9"/><path d="M4.5 4.5v4.4h4.4"/>',
  reset: '<path d="M4 12h3M17 12h3M12 4v3M12 17v3"/><circle cx="12" cy="12" r="5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  waves: '<path d="M3.5 9c2.1-2 4.2-2 6.3 0s4.2 2 6.3 0 3.2-1.4 4.4-.9M3.5 15c2.1-2 4.2-2 6.3 0s4.2 2 6.3 0 3.2-1.4 4.4-.9"/>',
} as const;

export type IconName = keyof typeof paths;

export function icon(name: IconName): string {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
