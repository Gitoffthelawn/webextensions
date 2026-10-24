/* global browser */
const DEFAULTS = {
  openMode: "newtab", // newtab | bgtab | current
  showOrigin: false, // first row: "https://host" instead of "host"
  showSubdomains: false, // example.com, b.example.com, a.b.example.com
  showQuery: true, // whole "?a=1&b=2" row
  showParams: false, // one row per query parameter
  showHash: true, // "#fragment" row
  showCopyButton: true,
  decode: true, // decode %20 etc. in labels
  theme: "auto", // auto | light | dark
  fontSize: 14,
  maxLength: 50,
  compact: false,
};

async function getSettings() {
  return { ...DEFAULTS, ...(await browser.storage.local.get(DEFAULTS)) };
}
