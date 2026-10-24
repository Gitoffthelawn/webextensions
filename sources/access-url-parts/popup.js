/* global browser, getSettings */
document.addEventListener("DOMContentLoaded", async () => {
  const s = await getSettings();
  const root = document.documentElement;
  root.style.colorScheme = s.theme === "auto" ? "light dark" : s.theme;
  root.style.setProperty("--fs", s.fontSize + "px");
  document.body.classList.toggle("compact", s.compact);

  document.querySelector("#settings").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    window.close();
  });

  const container = document.querySelector("#parts-container");

  const decode = (t) => {
    if (!s.decode) return t;
    try {
      return decodeURIComponent(t);
    } catch {
      return t;
    }
  };
  const shorten = (t) =>
    s.maxLength > 0 && t.length > s.maxLength
      ? t.slice(0, s.maxLength - 1) + "…"
      : t;

  let tab;
  async function openUrl(url, mode) {
    if (mode === "current") {
      await browser.tabs.update(tab.id, { url });
    } else {
      await browser.tabs.create({
        url,
        active: mode === "newtab",
        index: tab.index + 1,
        openerTabId: tab.id,
      });
    }
    if (mode !== "bgtab") window.close();
  }

  function addRow(text, href, cls = "") {
    const row = document.createElement("div");
    row.className = "row " + cls;

    const a = document.createElement("a");
    a.className = "part";
    a.href = href;
    a.title = href;
    a.textContent = shorten(text);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openUrl(href, s.openMode);
    });
    // middle click always opens a background tab
    a.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        openUrl(href, "bgtab");
      }
    });
    row.appendChild(a);

    if (s.showCopyButton) {
      const b = document.createElement("button");
      b.className = "copy";
      b.textContent = "⧉";
      b.title = "Copy URL";
      b.addEventListener("click", async () => {
        await navigator.clipboard.writeText(href);
        b.textContent = "✓";
        setTimeout(() => (b.textContent = "⧉"), 1000);
      });
      row.appendChild(b);
    }
    container.appendChild(row);
    return row;
  }

  try {
    [tab] = await browser.tabs.query({ currentWindow: true, active: true });
    const url = new URL(tab.url);
    if (url.origin === "null") {
      window.close();
      return;
    }

    // --- host ---
    const isIp = /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":");
    const labels = url.hostname.split(".");
    const portSuffix = url.port ? ":" + url.port : "";

    // Number of labels in the registrable domain (eTLD+1), e.g. 3 for foo.co.uk.
    // Uses Firefox's built-in Public Suffix List (Firefox 153+), falls back to 2.
    let baseLabels = 2;
    if (browser.publicSuffix?.getDomain) {
      try {
        const base = await browser.publicSuffix.getDomain(url.hostname);
        if (base) baseLabels = base.split(".").length;
      } catch (e) {
        console.error(e.toString());
      }
    }

    if (s.showSubdomains && !isIp && labels.length > baseLabels) {
      for (let i = labels.length - baseLabels; i >= 0; i--) {
        const host = labels.slice(i).join(".");
        addRow(host, `${url.protocol}//${host}${portSuffix}`);
      }
    } else {
      addRow(s.showOrigin ? url.origin : url.hostname, url.origin);
    }

    // --- path ---
    let prepend = url.origin;
    for (const seg of url.pathname.split("/")) {
      if (seg === "") continue;
      prepend += "/" + seg;
      addRow(decode(seg), prepend);
    }

    // --- query / hash ---
    const base = url.origin + url.pathname;
    if (s.showQuery && url.search.length > 1) {
      addRow(decode(url.search), base + url.search, "extra");
    }
    if (s.showParams) {
      for (const [k, v] of url.searchParams) {
        const q = "?" + new URLSearchParams([[k, v]]).toString();
        addRow(`${k} = ${v}`, base + q, "param");
      }
    }
    if (s.showHash && url.hash.length > 1) {
      addRow(decode(url.hash), base + url.search + url.hash, "extra");
    }

    // highlight the row matching the current page (ignoring hash)
    const cur = url.href.split("#")[0];
    [...container.querySelectorAll(".row")]
      .reverse()
      .find((r) => r.querySelector("a").href.split("#")[0] === cur)
      ?.classList.add("current");
  } catch (e) {
    console.error(e.toString());
  }
});
