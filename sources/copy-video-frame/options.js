/* global browser */

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  customSound: null, // data URL string, or null to use the bundled default
};

const MAX_SOUND_BYTES = 500 * 1024; // 500 KB
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
];
const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".ogg"];

const soundEnabledEl = document.getElementById("soundEnabled");
const soundInfoEl = document.getElementById("soundInfo");
const currentSoundEl = document.getElementById("currentSound");
const testSoundEl = document.getElementById("testSound");
const chooseFileEl = document.getElementById("chooseFile");
const soundFileEl = document.getElementById("soundFile");
const resetSoundEl = document.getElementById("resetSound");
const statusEl = document.getElementById("status");

let settings = { ...DEFAULT_SETTINGS };
let statusTimer = null;

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "error" : "ok";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = "";
    statusEl.className = "";
  }, 2500);
}

function refreshUI() {
  soundEnabledEl.checked = settings.soundEnabled;
  const hasCustom = Boolean(settings.customSound);
  currentSoundEl.textContent = hasCustom ? "custom" : "default";
  soundInfoEl.classList.toggle("custom", hasCustom);
  resetSoundEl.disabled = !hasCustom;
}

async function loadSettings() {
  const stored = await browser.storage.local.get(DEFAULT_SETTINGS);
  settings = { ...DEFAULT_SETTINGS, ...stored };
  refreshUI();
}

async function saveSettings(partial) {
  settings = { ...settings, ...partial };
  await browser.storage.local.set(settings);
  refreshUI();
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function hasAllowedExtension(name) {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isAllowedType(file) {
  // Some platforms report an empty/odd MIME type for audio files, so fall
  // back to checking the file extension too.
  return ALLOWED_TYPES.includes(file.type) || hasAllowedExtension(file.name);
}

soundEnabledEl.addEventListener("change", () => {
  saveSettings({ soundEnabled: soundEnabledEl.checked });
});

chooseFileEl.addEventListener("click", () => {
  soundFileEl.click();
});

soundFileEl.addEventListener("change", async () => {
  const file = soundFileEl.files[0];
  soundFileEl.value = "";
  if (!file) {
    return;
  }

  if (!isAllowedType(file)) {
    showStatus("Unsupported file type. Use MP3, WAV, or OGG.", true);
    return;
  }

  if (file.size > MAX_SOUND_BYTES) {
    showStatus(
      `File too large (${Math.ceil(file.size / 1024)} KB). Max is 500 KB.`,
      true,
    );
    return;
  }

  try {
    const dataURL = await fileToDataURL(file);
    await saveSettings({ customSound: dataURL });
    showStatus("Custom sound saved");
  } catch (e) {
    console.error(e);
    showStatus("Failed to read file", true);
  }
});

resetSoundEl.addEventListener("click", () => {
  saveSettings({ customSound: null });
  showStatus("Reset to default sound");
});

testSoundEl.addEventListener("click", () => {
  const src = settings.customSound || "shutter.mp3";
  const audio = new Audio(src);
  audio.play().catch((e) => {
    console.error(e);
    showStatus("Could not play sound", true);
  });
});

document.addEventListener("DOMContentLoaded", loadSettings);
