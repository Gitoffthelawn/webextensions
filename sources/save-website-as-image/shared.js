/* global browser */

// Settings, sound and filename helpers shared by background.js and options.js

const DEFAULT_FILENAME_PATTERN = "{timestamp}_{title}_{url}";

const DEFAULT_SETTINGS = {
  format: "jpeg",
  quality: 90,
  soundEnabled: true,
  soundChoice: "shutter",
  soundVolume: 70,
  customSound: "", // data: URL of a user supplied audio file
  customSoundName: "",
  filenamePattern: DEFAULT_FILENAME_PATTERN,
  filenameUnderscores: true, // replace whitespace with "_" in the file name
};

const BUILTIN_SOUNDS = {
  shutter: { label: "Shutter", file: "shutter.mp3" },
  click: { label: "Soft click", file: "click.mp3" },
  chime: { label: "Chime", file: "chime.mp3" },
};

// Plays the sound described by `settings`. Returns the play() promise.
function playSound(settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };

  let src;
  if (s.soundChoice === "custom" && s.customSound) {
    src = s.customSound;
  } else {
    const sound = BUILTIN_SOUNDS[s.soundChoice] || BUILTIN_SOUNDS.shutter;
    src = browser.runtime.getURL(sound.file);
  }

  const audio = new Audio(src);
  audio.volume = Math.min(1, Math.max(0, Number(s.soundVolume) / 100));
  return audio.play();
}

// ---- file name ----

// Placeholders the user can use in the file name pattern, e.g. "{date}_{title}"
const FILENAME_PLACEHOLDERS = {
  timestamp: { description: "Date and time", example: "2026-09-28_14-03-22" },
  date: { description: "Date", example: "2026-09-28" },
  time: { description: "Time", example: "14-03-22" },
  title: { description: "Page title", example: "My_Page_Title" },
  domain: { description: "Website (without www.)", example: "example.com" },
  url: {
    description: "Address without https:// and #fragment",
    example: "example.com/articles/42",
  },
};

// Total filename budget in bytes (without extension). The download folder path
// also counts toward OS limits (Windows ~260 chars), so stay well below the
// 255 byte name limit.
const MAX_FILENAME_BYTES = 150;
const MAX_TITLE_BYTES = 80;
const MAX_DOMAIN_BYTES = 60;

const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i;

const textEncoder = new TextEncoder();
const byteLen = (s) => textEncoder.encode(s).length;

function truncateToBytes(str, maxBytes) {
  let out = "";
  let used = 0;
  for (const ch of str) {
    // iterates by code point, never splits a surrogate pair
    const n = byteLen(ch);
    if (used + n > maxBytes) break;
    out += ch;
    used += n;
  }
  return out;
}

// dots/dashes/underscores/whitespace at the edges are troublesome (hidden files,
// leading "-" on command lines, Windows strips trailing dots/spaces)
const trimEdges = (s) => s.replace(/^[-._\s]+|[-._\s]+$/g, "");

// removes/replaces everything that can make a file name invalid
function cleanText(raw, spaceChar) {
  let s = String(raw ?? "");
  if (s.toWellFormed) s = s.toWellFormed(); // lone surrogates -> U+FFFD
  return (
    s
      .normalize("NFC")
      // control characters
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      // zero-width, line/paragraph separators, bidi overrides, BOM,
      // specials block (incl. U+FFFD and noncharacters)
      .replace(
        /[\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF0-\uFFFF]/g,
        "",
      )
      // characters illegal on Windows (and / \ everywhere)
      .replace(/[\\\/:*?"<>|]/g, "_")
      // Firefox rejects ".." (back-references), so collapse any run of 2+ dots
      .replace(/\.{2,}/g, "_")
      .replace(/\s+/g, spaceChar)
  );
}

// a dynamic value (title, url, ...) is cleaned and trimmed
const sanitizePart = (raw, spaceChar) =>
  trimEdges(cleanText(raw, spaceChar).replace(/_+/g, "_"));

// "https://www.example.com/a/b?x=1#top" -> "example.com/a/b?x=1"
function urlToLabel(url) {
  return String(url ?? "")
    .split("#")[0]
    .replace(/^[a-z][a-z0-9+.-]*:\/*/i, "")
    .replace(/^www\./i, "");
}

function urlToDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function getDateParts(d = new Date()) {
  const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`,
  };
}

// format: year-month-day_hour-minute-second
function getTimeStampStr(d = new Date()) {
  const { date, time } = getDateParts(d);
  return `${date}_${time}`;
}

// Builds a valid file name from the user's pattern. Never throws and never
// returns an empty name.
function buildFilename(title, url, extension, settings = {}, now = new Date()) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const spaceChar = s.filenameUnderscores ? "_" : " ";
  const ext = `.${extension}`;
  const budget = Math.max(1, MAX_FILENAME_BYTES - byteLen(ext));

  const { date, time } = getDateParts(now);
  const fixed = { timestamp: `${date}_${time}`, date, time };
  const flexible = {
    title: { raw: title, cap: MAX_TITLE_BYTES },
    domain: { raw: urlToDomain(url), cap: MAX_DOMAIN_BYTES },
    url: { raw: urlToLabel(url), cap: Infinity },
  };

  const pattern =
    String(s.filenamePattern ?? "").trim() || DEFAULT_FILENAME_PATTERN;

  // split with a capture group: even entries = literal text, odd = placeholder
  const parts = pattern
    .split(/\{(\w*)\}/)
    .map((text, i) =>
      i % 2
        ? { name: text.toLowerCase() }
        : { literal: cleanText(text, spaceChar) },
    );

  // bytes used by everything with a fixed size, and how often each flexible
  // placeholder occurs
  let remaining = budget;
  const count = { title: 0, domain: 0, url: 0 };
  for (const p of parts) {
    if (p.literal !== undefined) remaining -= byteLen(p.literal);
    else if (fixed[p.name]) remaining -= byteLen(fixed[p.name]);
    else if (p.name in count) count[p.name]++;
  }

  // share what is left between title, domain and url (in this priority)
  const values = { ...fixed };
  for (const name of ["title", "domain", "url"]) {
    if (!count[name]) continue;
    const allowed = Math.max(
      0,
      Math.floor(Math.min(flexible[name].cap, remaining) / count[name]),
    );
    const v = trimEdges(
      truncateToBytes(sanitizePart(flexible[name].raw, spaceChar), allowed),
    );
    values[name] = v;
    remaining -= byteLen(v) * count[name];
  }

  let base = parts
    .map((p) => (p.literal !== undefined ? p.literal : (values[p.name] ?? "")))
    .join("")
    .replace(/\.{2,}/g, "_")
    .replace(/_+/g, "_")
    .replace(/ +/g, " ");
  base = trimEdges(truncateToBytes(base, budget));

  if (!base) base = fixed.timestamp;
  // reserved Windows device names (CON, NUL, ...) are invalid even with an extension
  if (WINDOWS_RESERVED_NAME.test(base)) base = `_${base}`;

  return base + ext;
}
