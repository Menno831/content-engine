// Draait op het KTR Studio-platform: maakt zichtbaar dat de runner
// geïnstalleerd is en geeft een sprint-run door aan de achtergrond.
document.documentElement.setAttribute("data-ktr-runner", "1");

window.addEventListener("message", (e) => {
  if (e.source !== window) return;
  const d = e.data;
  if (!d || d.type !== "KTR_RUN" || !Array.isArray(d.items)) return;
  // Alleen handle + message doorgeven, niets anders.
  const items = d.items
    .filter((x) => x && typeof x.handle === "string" && typeof x.message === "string")
    .slice(0, 10)
    .map((x) => ({ handle: x.handle, message: x.message }));
  if (items.length) chrome.runtime.sendMessage({ type: "run", items });
});
