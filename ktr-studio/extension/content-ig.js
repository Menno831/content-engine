// Draait op instagram.com: als deze tab door de runner is geopend,
// wacht op de chat-composer en typ het klaargezette bericht in.
// Er wordt niets verstuurd en geen Enter gedrukt - dat doet Menno zelf.
chrome.runtime.sendMessage({ type: "getMessage" }, (resp) => {
  const message = resp && resp.message;
  if (!message) return; // gewone Instagram-tab, niets doen

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    const box = document.querySelector('[role="textbox"][contenteditable="true"]');
    if (box) {
      clearInterval(timer);
      // Alleen invullen als de composer leeg is (nooit een bestaand
      // concept of half getypt bericht overschrijven).
      if ((box.textContent || "").trim() === "") {
        box.focus();
        document.execCommand("insertText", false, message);
      }
    } else if (tries > 60) {
      clearInterval(timer); // 30s zonder composer (login/checkpoint) -> opgeven
    }
  }, 500);
});
