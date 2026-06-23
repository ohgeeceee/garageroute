# GarageRoute Bridge — Chrome extension

**Tier 3 of the GarageRoute inventory moat.** An opt-in browser extension that
reads yard-sale listings from the logged-in user's Facebook Marketplace feed
and surfaces them into their GarageRoute account.

> ⚠️ **Status: scaffold.** The content script is intentionally a stub. The DOM
> selectors inside `content.js` are placeholders that must be verified against
> the live Facebook Marketplace page before this is shipped to real users.

## Why this is opt-in

Scraping Facebook Marketplace while logged in without explicit user consent
violates Facebook's ToS and risks account bans. This extension only runs:

1. When the user has **explicitly connected** their GarageRoute account by
   generating a one-time token in `/connect-extension` and pasting it into the
   extension settings.
2. While the user is logged into Facebook in the browser.
3. Reads DOM only. Does not POST to facebook.com, does not modify the page,
   does not use residential proxies, does not impersonate other users.

This is the **Honey / Rakuten** model — user-mediated, ToS-clean, defensible.

## Files

```
extensions/garageroute-bridge/
├── manifest.json     Manifest V3
├── background.js     Service worker — relays items to garageroute.com
├── content.js        Content script — runs on facebook.com/marketplace/*
├── popup.html        Extension popup
├── popup.js          Popup logic
└── icons/            (TODO: ship 16/48/128 px PNG icons)
```

## Install (dev / unpacked)

1. `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `extensions/garageroute-bridge/`

## Flow

1. User logs into garageroute.com, opens `/connect-extension`.
2. Page calls `POST /api/extension/token` → returns a one-time token.
3. User copies the token into the extension popup (TODO: storage.set from popup).
4. Background service worker pulls items from the content script every 60s,
   batches them (max 25), POSTs to `/api/extension/ingest` with the token.
5. garageroute.com normalizes + upserts them like any other ingest source.

## What still needs to happen

- [ ] Verify the DOM selectors in `content.js` against live FB Marketplace
      in your target market. Iterate until extraction is reliable.
- [ ] Add a "paste token" UI inside the popup (currently auto-detected from
      `chrome.storage.local.grBridge.token`).
- [ ] Generate proper icon assets.
- [ ] Decide on the marketplace geography (the extension should only scrape
      a configured region to limit exposure).
- [ ] Publish to Chrome Web Store under a real developer account when ready.

## What this is NOT

- Not a Facebook scraper in the server-side sense. The server never touches FB.
- Not an automatic seller. Listings surface as drafts in the user's account
  for review — we do not auto-post.
- Not a workaround for FB rate limits. The extension only reads what the user
  is already browsing.