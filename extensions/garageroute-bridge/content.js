/**
 * Content script — runs on facebook.com/marketplace/* while the user is
 * logged in. Reads visible listings and posts them to the background worker
 * for batching + relay to garageroute.com.
 *
 * === IMPORTANT ===
 *
 * This file is INTENTIONALLY a stub. Facebook's Marketplace DOM is
 * intentionally undocumented, changes without notice, and varies by A/B
 * cohort. Do not deploy the extension to real users until the selectors
 * below are verified against the live DOM in your target market.
 *
 * Strategy when you fill this in:
 *   - Use MutationObserver to handle infinite scroll.
 *   - De-dup on the listing URL.
 *   - Pull the seller name from the listing detail, not the search card.
 *   - Be defensive: if any field is missing, skip the item rather than
 *     send garbage. Garbage in = trust bomb out.
 *
 * Compliance:
 *   This script only reads the DOM while the user is logged in and has
 *   explicitly opted in via the popup. We do not POST to facebook.com,
 *   do not modify the page, and do not bypass any rate limit.
 */

(() => {
  const SENT_KEY = "__grBridgeSent";
  if (window[SENT_KEY]) return; // re-injection guard
  window[SENT_KEY] = new Set();

  const observed = new WeakSet();
  const debounceTimers = new WeakMap();

  function debounceScan(root) {
    if (debounceTimers.has(root)) clearTimeout(debounceTimers.get(root));
    const t = setTimeout(() => scan(root), 600);
    debounceTimers.set(root, t);
  }

  function scan(root) {
    // Replace these selectors with verified ones for the current FB DOM.
    // Each card on the search results grid is typically an <a> linking to
    // /marketplace/item/<id>. The card body has the title and price text.
    const cards = (root || document).querySelectorAll(
      'a[href*="/marketplace/item/"]'
    );
    const items = [];
    for (const card of cards) {
      const sourceUrl = card.href;
      if (!sourceUrl || window[SENT_KEY].has(sourceUrl)) continue;
      const title = (card.textContent || "").trim().slice(0, 200);
      if (!looksLikeYardSale(title)) continue;

      const photo = card.querySelector("img")?.src || "";
      const priceText = (card.textContent || "").match(/\$[\d,]+/);
      const price = priceText ? parseInt(priceText[0].replace(/\D/g, ""), 10) : null;

      items.push({
        sourceUrl,
        title,
        photo,
        price,
        scrapedAt: new Date().toISOString(),
      });
      window[SENT_KEY].add(sourceUrl);
    }
    if (items.length === 0) return;

    chrome.runtime.sendMessage({ type: "gr-bridge:items", items }).catch(() => {
      // Background not ready — items will be lost. Acceptable; FB DOM is lossy.
    });
  }

  function looksLikeYardSale(text) {
    const t = text.toLowerCase();
    return (
      t.includes("garage") ||
      t.includes("yard") ||
      t.includes("moving") ||
      t.includes("estate") ||
      t.includes("multi family") ||
      t.includes("block sale")
    );
  }

  function observe(root) {
    if (!root || observed.has(root)) return;
    observed.add(root);
    const obs = new MutationObserver(() => debounceScan(root));
    obs.observe(root, { childList: true, subtree: true });
  }

  // Wait until DOM is idle then attach to the main scrollable container.
  // FB uses a top-level <div role="main"> typically; fall back to body.
  function bootstrap() {
    const main = document.querySelector('div[role="main"]') || document.body;
    observe(main);
    scan(main);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    bootstrap();
  } else {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  }
})();