# Docs

| Guide | When you need it |
| --- | --- |
| [Getting started](getting-started.md) | Setting up the repo, loading an extension into Chrome/Edge, the edit → reload loop, running tests. |
| [Building & versioning](building-and-versioning.md) | What each script does, how versions/tags/changelogs work, cutting a release, CI. |
| [Registering store accounts](registering-store-accounts.md) | One-time: create your Chrome Web Store and Microsoft Edge Add-ons developer accounts. |
| [Uploading to the stores](uploading-to-the-stores.md) | First submission (every field explained) and shipping updates. |
| [Adding an extension](adding-an-extension.md) | Starting a new extension in this repo. |

**Shortest path from code to the stores:**

1. Register both developer accounts once ([guide](registering-store-accounts.md)).
2. `npm run release -- mermaid-lens patch --push` ([guide](building-and-versioning.md#cutting-a-release)).
3. Upload `extensions/mermaid-lens/release/mermaid-lens-<version>.zip` to both dashboards ([guide](uploading-to-the-stores.md)).
