// App Designer device chrome: injects status bar, Dynamic Island and home
// indicator into every .screen. See device.css for the data-chrome options.
(() => {
  const signal = `<svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="7.5" width="3.2" height="4.5" rx="1"/><rect x="5" y="5" width="3.2" height="7" rx="1"/><rect x="10" y="2.5" width="3.2" height="9.5" rx="1"/><rect x="15" y="0" width="3.2" height="12" rx="1"/></svg>`;
  const wifi = `<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.6c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8.5.9 10.2 10.2 0 0 0 1.3 3.8L2.5 5a8.5 8.5 0 0 1 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8.5 4.3c-1.8 0-3.5.7-4.8 1.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Zm0 3.4c-.5 0-1 .2-1.3.5L8.5 11.2l1.3-1.3c-.3-.3-.8-.5-1.3-.5Z"/></svg>`;
  const battery = `<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".45"/></svg>`;

  for (const s of document.querySelectorAll(".screen, .mini-screen")) {
    if (s.dataset.chrome === "none") continue;
    s.insertAdjacentHTML(
      "beforeend",
      `<div class="ac-status" aria-hidden="true"><span>${s.dataset.time || "9:41"}</span><span class="ac-right">${signal}${wifi}${battery}</span></div>` +
        `<div class="ac-island" aria-hidden="true"></div>` +
        `<div class="ac-home" aria-hidden="true"></div>`
    );
  }
})();
