# Store listing copy

## Name
Mermaid Lens

## Short description (≤132 chars)
Pan, zoom, expand, highlight, animate and copy Mermaid diagrams on GitHub and any site you choose.

## Detailed description
Mermaid Lens makes Mermaid diagrams on GitHub easier to explore.

GitHub renders Mermaid diagrams in a small, fixed frame with basic controls. Mermaid Lens replaces that frame with a viewer you can actually move around in:

• Pan by dragging, and zoom with Ctrl/⌘ + scroll, trackpad pinch or the zoom buttons
• Expand large diagrams to fill the browser tab
• Click any node or arrow to highlight what it's connected to: direct neighbours or the full upstream/downstream flow
• Pick the highlight colour
• Animate the diagram: flowing edges show direction, or replay the diagram being drawn step by step
• Copy the Mermaid code, copy the diagram as an image, or download PNG/SVG
• Open any diagram in the Mermaid Live Editor
• A clean hover toolbar that matches GitHub's light and dark themes
• Switch it off for any site from the toolbar menu or the extension icon

Works on README files, markdown files, issues, pull requests, discussions, wikis and gists. You can also turn it on for any other site that shows Mermaid diagrams (GitLab, docs sites, etc.); it asks for permission only for that site.

Privacy: no tracking or data collection, and the extension makes no network requests of its own. Mermaid is bundled with the extension.

Keyboard: F expand in tab · 0 fit · +/− zoom · arrows pan · Esc clear highlight.

## Category
Developer Tools

## Single purpose (Chrome "Privacy" tab)
Enhances Mermaid diagrams on web pages with pan/zoom, in-tab expansion, highlighting, animation and copy/export controls.

## Permission justifications (Chrome "Privacy" tab)
- **storage**: Saves the user's preferences (highlight colour/mode, animation, theme, sites where the extension is switched off).
- **scripting**: Injects the diagram viewer (and the bundled Mermaid library) only after a Mermaid diagram is detected on the page, and registers the viewer on extra sites the user explicitly enables.
- **activeTab**: Lets the popup show and toggle the extension for the current site, and run it once on the current page without granting permanent access.
- **Host permission github.com / gist.github.com**: The extension's main purpose is enhancing Mermaid diagrams rendered on GitHub.
- **Optional host permissions (any site)**: Requested at runtime, one site at a time, only when the user turns the extension on for that site from the popup.

## Remote code
No. All code, including the Mermaid library, ships in the package.

## Data usage
Does not collect or use any user data.

## Test instructions (Edge "Notes for certification")
1. Open https://github.com/mermaid-js/mermaid/blob/develop/README.md
2. Hover a diagram: a toolbar appears top-right. Drag to pan, Ctrl+scroll to zoom.
3. Hover a node to highlight its connections (click to pin). Use the toolbar to change colour, animate, copy, or expand the diagram in the tab.
4. Toolbar ⋯ menu → "Enabled on github.com" switches it off. Re-enable from the extension's toolbar icon.
