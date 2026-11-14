# Registering store accounts (one-time)

You need one developer account per store. Both can publish any number of
extensions, so this is a one-off.

## Before you start: a public privacy-policy URL

Both stores ask for a privacy policy URL. Each extension has one
(`extensions/<name>/PRIVACY.md`), but reviewers must be able to open it:

- **Public repo:** use the GitHub link, e.g.
  `https://github.com/<you>/browser-tools/blob/main/extensions/mermaid-lens/PRIVACY.md`.
- **Private repo:** publish `PRIVACY.md` somewhere public: a public gist,
  GitHub Pages from a small public repo, or your own site.

Also decide on a **publisher name** (shown under your extensions in the stores) and a
**support email** you're happy to have shown publicly.

## Chrome Web Store

Cost: **US$5, one-time.**

1. **Choose the Google account.** Use one you'll keep for good, since moving
   extensions between accounts later is painful. A dedicated account (for example
   `you.extensions@gmail.com`) keeps store email separate.
2. **Turn on 2-Step Verification** for that account
   (<https://myaccount.google.com/security>). The dashboard requires it.
3. Open the **Developer Dashboard**: <https://chrome.google.com/webstore/devconsole>.
4. Accept the **Developer Agreement** and pay the **registration fee**.
5. Go to **Account** and fill in:
   - **Publisher name**: your display name in the store.
   - **Contact email**: verify it (Google emails you a link). You can't publish until it's verified.
   - **Trader / non-trader declaration** (EU Digital Services Act). A free
     hobby extension is usually **non-trader**. If you sell anything or publish as a
     business, you're a trader and must provide address and phone details, which
     are shown publicly in the EU.
   - Optional: **verify a website/domain** you own to show as the publisher.
6. Optional but useful: set up a **group publisher** if you might share
   publishing with someone else later.

Docs: <https://developer.chrome.com/docs/webstore/register>

## Microsoft Edge Add-ons

Cost: **free.**

1. You need a **personal Microsoft account** (outlook.com, hotmail, or any
   email registered as a Microsoft account). **Work or school accounts are not
   accepted.** Alternatively, sign in with **GitHub** and Microsoft creates a
   linked account for you.
2. Open **Partner Center → Microsoft Edge**:
   <https://partner.microsoft.com/dashboard/microsoftedge/overview>
3. Fill in the **Edge developer registration form**:
   - **Account type**: **Individual**, unless you're publishing as a registered
     company. Individual verification only checks that your publisher name is free and
     finishes quickly. Company accounts need business verification that can take days.
   - **Publisher display name**, **contact details**, country.
   - Accept the **App Developer Agreement**.
4. Wait for the account to show as active (individual accounts are usually quick).

Docs: <https://learn.microsoft.com/microsoft-edge/extensions/publish/create-dev-account>

## Checklist

- [ ] Google account with 2-Step Verification, $5 paid, contact email verified, trader status set
- [ ] Personal Microsoft (or GitHub) account registered in Partner Center → Edge
- [ ] Publisher name chosen (ideally the same in both stores)
- [ ] Public URL for each extension's privacy policy
- [ ] Support email or URL (the repo's Issues page works if it's public)

Next: [Uploading to the stores](uploading-to-the-stores.md).
