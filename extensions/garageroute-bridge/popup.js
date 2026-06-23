// Popup script — checks whether the user has linked their GarageRoute account.
// If not, surface a button that opens the /connect-extension page.

const statusEl = document.getElementById("status");
const connectEl = document.getElementById("connect");

chrome.runtime.sendMessage({ type: "gr-bridge:getStatus" }, (resp) => {
  const status = resp || {};
  if (!status.configured) {
    statusEl.className = "status off";
    statusEl.textContent = "Not connected. Generate a connection token on GarageRoute.";
    connectEl.href = "https://garageroute.com/connect-extension";
    connectEl.style.display = "inline-block";
    return;
  }
  statusEl.className = "status ok";
  statusEl.textContent = `Connected. ${status.queueSize} item(s) queued for sync.`;
  connectEl.href = "https://garageroute.com/connect-extension";
  connectEl.textContent = "Manage connection";
  connectEl.style.display = "inline-block";
});