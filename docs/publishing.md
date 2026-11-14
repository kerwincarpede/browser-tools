# Publishing to the Chrome Web Store and Microsoft Edge Add-ons

The same zip works for both stores (Edge runs Chrome extensions as-is).

## One-time setup

### Chrome Web Store

1. Pick the Google account that will own your extensions. A dedicated account is
   a good idea because ownership is awkward to transfer later. Turn on 2-Step
   Verification.
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole),
   accept the developer agreement and pay the **one-time US$5 registration fee**
   ([docs](https://developer.chrome.com/docs/webstore/register)).
3. In **Account**, set a publisher display name, verify the contact email, and
   answer the **trader / non-trader** question (EU Digital Services Act). For free
   hobby extensions, "non-trader" is usual. Read the definition before choosing.
4. Optional: verify a domain or website as your publisher identity.

### Microsoft Edge Add-ons

1. Use a **personal** Microsoft account (or sign in with GitHub, which creates
   one). Work/school accounts can't register.
2. Go to [Partner Center → Microsoft Edge program](https://partner.microsoft.com/dashboard/microsoftedge/overview)
   and complete the registration form. **No fee.**
   ([docs](https://learn.microsoft.com/microsoft-edge/extensions/publish/create-dev-account))
3. Choose **Individual** (quick: only checks your publisher name is free) unless
   you're publishing as a company, which needs business verification that can take days.

## Things to prepare before the first submission

| Item | Chrome | Edge | Where it lives |
| --- | --- | --- | --- |
| Package zip | ✅ | ✅ | `npm run package` → `extensions/<name>/release/*.zip` |
| Icon 128×128 | ✅ (in zip) | ✅ (in zip) | `icons/icon-128.png` |
| Store logo 300×300 | – | ✅ | render `assets/icon.svg` at 300px |
| Screenshots 1280×800 (or 640×400) | ≥1, up to 5 | ≥1, up to 10 | take on a real GitHub page |
| Small promo tile 440×280 | recommended | optional | |
| Description (Edge needs ≥250 chars) | ✅ | ✅ | `store/listing.md` |
| Privacy policy URL | ✅ | ✅ | link to `PRIVACY.md` on GitHub |
| Permission justifications | ✅ | – | `store/listing.md` |
| Category | Developer Tools | Developer tools | |

Render the Edge logo with:

```sh
rsvg-convert -w 300 -h 300 extensions/mermaid-lens/assets/icon.svg -o logo-300.png
```

## Submitting

**Chrome:** Dashboard → *New item* → upload zip → fill *Store listing*, *Privacy*
(single purpose, permission justifications, "no remote code", data-use
certification) and *Distribution*. Choose **Unlisted** to share with friends by
link first, then switch to **Public** when you're happy. Review usually takes a
few days. Broad host permissions slow it down, which is why Mermaid Lens only
asks for github.com up front and requests other sites at runtime.

**Edge:** Partner Center → Microsoft Edge → *Create new extension* → upload zip →
*Availability* (Public or Hidden) → *Properties* (category, privacy policy URL,
website) → *Store listing* → submit. In *Notes for certification*, add test
steps, e.g. "Open https://github.com/mermaid-js/mermaid/blob/develop/README.md,
hover a diagram". Certification can take up to 7 business days.

## Every release

1. Bump `version` in `extensions/<name>/package.json` (the build copies it into the manifest).
2. `npm test && npm run package -w <name>`.
3. Upload the new zip to both dashboards and submit for review.
4. Tag the commit: `git tag <name>-v<version> && git push --tags`.

## Notes for review

- Mermaid is bundled (`vendor/mermaid.min.js`, MIT). Nothing loads remote code,
  which satisfies the MV3 "no remotely hosted code" rule.
- Bundled code is not minified, so reviewers can read it.
- The extension collects no data. Settings stay in `chrome.storage.sync`.
