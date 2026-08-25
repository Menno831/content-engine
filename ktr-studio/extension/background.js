// Achtergrond: opent per prospect een tab (rustig tempo, 3s ertussen)
// en onthoudt per tab welk bericht erbij hoort. De content-script op
// Instagram vraagt zijn bericht op via tab-id. Er wordt NOOIT verstuurd.
const byTab = new Map(); // tabId -> message

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "run" && Array.isArray(msg.items)) {
    runQueue(msg.items);
    sendResponse({ ok: true, count: msg.items.length });
    return;
  }
  if (msg?.type === "getMessage" && sender.tab?.id != null) {
    const m = byTab.get(sender.tab.id) ?? null;
    sendResponse({ message: m });
    return;
  }
});

async function runQueue(items) {
  for (const item of items) {
    try {
      const tab = await chrome.tabs.create({
        url: `https://ig.me/m/${encodeURIComponent(item.handle)}`,
        active: false,
      });
      byTab.set(tab.id, item.message);
    } catch (e) {
      // tab openen mislukt -> stil doorgaan met de volgende
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

chrome.tabs.onRemoved.addListener((tabId) => byTab.delete(tabId));
