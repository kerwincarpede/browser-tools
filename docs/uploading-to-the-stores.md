# Uploading to the stores

The **same zip** goes to both stores: `extensions/<name>/release/<name>-<version>.zip`
(from `npm run release` or `npm run package`, or attached to the GitHub Release).

Everything you'll paste is in `extensions/<name>/store/`:

| File | Used for |
| --- | --- |
| `store/listing.md` | Name, short and long description, category, single purpose, permission justifications, test instructions |
| `store/assets/screenshot-*.png` | Screenshots, 1280×800 |
| `store/assets/promo-small.png` | Small promo tile, 440×280 |
| `store/assets/promo-marquee.png` | Chrome marquee / Edge large promo tile, 1400×560 |
| `store/assets/logo-300.png` | Edge store logo, 300×300 |
| `icons/icon-128.png` | Chrome store icon, 128×128 |
| `PRIVACY.md` | Privacy policy (needs a public URL; see [registering](registering-store-accounts.md)) |

Run `npm run store-assets` to regenerate the images after UI changes.

---

## Chrome Web Store: first submission

<https://chrome.google.com/webstore/devconsole> → **+ New item** → upload the zip.
The dashboard then has several tabs on the left.

### Package
Shows the uploaded version. Nothing else to do.

### Store listing
| Field | What to enter |
| --- | --- |
| Description | "Detailed description" from `listing.md` (the short one comes from the manifest) |
| Category | **Developer Tools** |
| Language | English |
| Store icon | `icons/icon-128.png` |
| Screenshots | 1–5 from `store/assets/` (1280×800). The first one matters most. |
| Small promo tile | `promo-small.png` (optional, but it makes the listing look finished) |
| Marquee promo tile | `promo-marquee.png` (optional; only used if Google features you) |
| Official URL / Homepage | The GitHub repo, if public |
| Support URL | Repo Issues page, or an email |

### Privacy
| Field | What to enter |
| --- | --- |
| Single purpose | From `listing.md` |
| Permission justification | One box per permission (`storage`, `scripting`, `activeTab`) plus host permissions. Copy from `listing.md`. |
| Remote code | **No, I am not using remote code** |
| Data usage | Tick **nothing** in "collects", then tick all three certification checkboxes (not sold, not used for unrelated purposes, not used for creditworthiness) |
| Privacy policy URL | Public link to `PRIVACY.md` |

### Distribution
- **Payments:** Free.
- **Visibility:**
  - **Private**: only testers you list (by email or Google Group). Good for a first try.
  - **Unlisted**: anyone with the link can install it, but it isn't searchable.
    Great for sharing with friends while you're still polishing.
  - **Public**: searchable in the store.
- **Regions:** All regions.

### Submit
Click **Submit for review**. You can untick "Publish automatically after
review" if you want to choose when it goes live; you then have 30 days to
publish after approval.

**Review time:** usually a few days, occasionally longer. Asking for broad host
access (`<all_urls>`) triggers slower, in-depth review. Mermaid Lens avoids that
by requesting only github.com up front and other sites at runtime.

Your store URL looks like `https://chromewebstore.google.com/detail/<id>`.
The ID never changes.

---

## Microsoft Edge Add-ons: first submission

<https://partner.microsoft.com/dashboard/microsoftedge/overview> →
**Create new extension** → upload the zip, then work through the sections:

### Availability
- **Visibility:** **Public** (searchable) or **Hidden** (installable only via direct link, like Chrome's Unlisted).
- **Markets:** all markets.

### Properties
| Field | What to enter |
| --- | --- |
| Category | **Developer tools** |
| Privacy policy requirements | **Yes**, with the `PRIVACY.md` URL |
| Website URL | GitHub repo (if public) |
| Support contact details | Issues URL or email |
| Mature content | No |

### Store listings (English)
| Field | What to enter |
| --- | --- |
| Description | Detailed description from `listing.md` (**minimum 250 characters**, max 5,000) |
| Extension logo | `store/assets/logo-300.png` (1:1, 300×300 recommended) |
| Small promotional tile | `promo-small.png` (optional) |
| Large promotional tile | `promo-marquee.png` (optional) |
| Screenshots | `screenshot-*.png` (1280×800 or 640×480, up to 10) |
| Search terms | e.g. mermaid, diagram, github, flowchart, zoom |

### Submit
Fill **Notes for certification** with the "Test instructions" from
`listing.md`, then **Publish**. Certification can take **up to 7 business
days**. You'll get an email either way.

Your listing URL looks like `https://microsoftedge.microsoft.com/addons/detail/<id>`.

---

## Shipping an update

1. `npm run release -- <name> patch --push` (new version, zip, tag, GitHub Release).
2. **Chrome:** dashboard → your item → **Package** → **Upload new package** →
   **Submit for review**. Edit listing text or images on their tabs first if they changed.
3. **Edge:** Partner Center → your extension → **Update** → **Packages** →
   replace the zip → **Publish**.
4. Users get the update automatically, usually within hours of approval.

Things that trigger extra review: new permissions or host permissions (users
also have to re-approve these, and the extension stays disabled until they do),
big changes to what the extension does, or a description that doesn't match the code.

## If a submission is rejected

You'll get an email naming the policy. The usual causes are:

- **Permission not justified or not used.** Remove unused permissions and make each justification concrete.
- **Description doesn't match functionality**, or a keyword-stuffed description.
- **Missing or broken privacy policy URL.**
- **Obfuscated code.** Ours isn't minified, so this shouldn't come up.

Fix it, **bump the version** (`npm run release -- <name> patch`), and resubmit.
Both stores reject reusing a version number.

## Optional: automate uploads later

Both stores have publishing APIs that a GitHub Actions step could call after the
GitHub Release:

- Chrome Web Store API: <https://developer.chrome.com/docs/webstore/using-api>
  (OAuth client + refresh token as repo secrets).
- Edge Add-ons API: <https://learn.microsoft.com/microsoft-edge/extensions/publish/api/using-addons-api>
  (API key + client ID from Partner Center).

This isn't set up yet. Do the first submission by hand in each store either way,
because the APIs only update items that already exist.
