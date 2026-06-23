/**
 * Background service worker (Manifest V3).
 *
 * Responsibilities:
 *   1. Receive scraped items from the content script via chrome.runtime messages.
 *   2. Batch + relay them to garageroute.com via /api/extension/ingest.
 *   3. Authenticate with a token the user generated from /connect-extension
 *      and stored in chrome.storage.local.
 *
 * Important: this only sends data to garageroute.com. The content script is
 * the only thing that touches facebook.com, and it only reads DOM while the
 * user is logged in. The user opted in via the popup.
 *
 * The content script is intentionally a stub — Facebook's Marketplace DOM
 * changes frequently. The real extractor lives there and must be maintained
 * alongside FB's HTML structure. See content.js for a skeleton with the
 * selectors most likely to survive a quarter.
 */

const HEARTBEAT_MS = 60_000;          // drain queue every minute
const BATCH_MAX = 25;                  // items per /ingest call
const INGEST_PATH = "/api/extension/ingest";

// chrome.storage.local keys
const K_TOKEN = "grBridge.token";
const K_QUEUE = "grBridge.queue";
const K_API_BASE = "grBridge.apiBase";

let drainTimer = null;

chrome.runtime.onInstalled.addListener(() => {
  scheduleDrain();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleDrain();
});

function scheduleDrain() {
  if (drainTimer) clearInterval(drainTimer);
  drainTimer = setInterval(() => {
    drainQueue().catch((err) => console.warn("[gr-bridge] drain failed", err));
  }, HEARTBEAT_MS);
}

// Receive items from the content script. Items are stashed and drained.
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "gr-bridge:items" && Array.isArray(msg.items)) {
    enqueueItems(msg.items).catch((err) =>
      console.warn("[gr-bridge] enqueue failed", err)
    );
    return;
  }
  if (msg.type === "gr-bridge:getStatus") {
    getStatus().then((status) => _sendResponse(status));
    return true; // keep channel open for async sendResponse
  }
});

async function getStatus() {
  const token = await getToken();
  const queue = await getQueue();
  return {
    configured: Boolean(token),
    queueSize: queue.length,
  };
}

async function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.local.get([K_API_BASE], (data) => {
      resolve(typeof data[K_API_BASE] === "string" ? data[K_API_BASE] : "https://garageroute.com");
    });
  });
}

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([K_TOKEN], (data) => {
      resolve(typeof data[K_TOKEN] === "string" ? data[K_TOKEN] : "");
    });
  });
}

async function getQueue() {
  return new Promise((resolve) => {
    chrome.storage.local.get([K_QUEUE], (data) => {
      resolve(Array.isArray(data[K_QUEUE]) ? data[K_QUEUE] : []);
    });
  });
}

async function setQueue(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [K_QUEUE]: items }, () => resolve());
  });
}

async function enqueueItems(items) {
  const queue = await getQueue();
  // De-dup by URL.
  const seen = new Set(queue.map((q) => q.sourceUrl));
  for (const item of items) {
    if (item && item.sourceUrl && !seen.has(item.sourceUrl)) {
      queue.push(item);
      seen.add(item.sourceUrl);
    }
  }
  await setQueue(queue);
}

async function drainQueue() {
  const token = await getToken();
  if (!token) return; // user hasn't opted in
  let queue = await getQueue();
  if (queue.length === 0) return;

  const apiBase = await getApiBase();
  const batch = queue.slice(0, BATCH_MAX);
  try {
    const res = await fetch(`${apiBase}${INGEST_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ items: batch }),
    });
    if (!res.ok) {
      console.warn("[gr-bridge] ingest non-2xx", res.status);
      return;
    }
    // Ack: drop the items we just sent.
    queue = queue.slice(batch.length);
    await setQueue(queue);
  } catch (err) {
    console.warn("[gr-bridge] ingest network error", err);
  }
}