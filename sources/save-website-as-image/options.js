/* global browser, DEFAULT_SETTINGS, BUILTIN_SOUNDS, playSound */

const MAX_CUSTOM_SOUND_BYTES = 1024 * 1024; // 1 MB

const formatRadios = document.querySelectorAll('input[name="format"]');
const qualityInput = document.getElementById("quality");
const qualityValue = document.getElementById("quality-value");
const qualityBlock = document.getElementById("quality-block");
const qualityHint = document.getElementById("quality-hint");
const soundEnabled = document.getElementById("sound-enabled");
const soundSettings = document.getElementById("sound-settings");
const soundChoice = document.getElementById("sound-choice");
const soundPreview = document.getElementById("sound-preview");
const soundVolume = document.getElementById("sound-volume");
const soundVolumeValue = document.getElementById("sound-volume-value");
const customRow = document.getElementById("custom-row");
const customFile = document.getElementById("custom-file");
const customName = document.getElementById("custom-name");
const status = document.getElementById("status");
const welcome = document.getElementById("welcome");
const dismissBtn = document.getElementById("dismiss");

let statusTimer = null;
let customSound = "";
let customSoundName = "";

// ---- helpers ----

function currentFormat() {
  const selected = document.querySelector('input[name="format"]:checked');
  return selected ? selected.value : DEFAULT_SETTINGS.format;
}

function currentSoundSettings() {
  return {
    soundEnabled: soundEnabled.checked,
    soundChoice: soundChoice.value,
    soundVolume: parseInt(soundVolume.value, 10),
    customSound,
    customSoundName,
  };
}

function showMessage(text, isError = false) {
  status.textContent = text;
  status.classList.toggle("error", isError);
  status.classList.add("show");
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(
    () => status.classList.remove("show"),
    isError ? 4000 : 1500,
  );
}

function updateQualityState() {
  const isJpeg = currentFormat() === "jpeg";
  qualityInput.disabled = !isJpeg;
  qualityBlock.classList.toggle("disabled", !isJpeg);
  qualityHint.hidden = isJpeg;
}

function updateSoundState() {
  const enabled = soundEnabled.checked;
  soundSettings.classList.toggle("disabled", !enabled);
  soundChoice.disabled = !enabled;
  soundVolume.disabled = !enabled;
  soundPreview.disabled = !enabled;
  customFile.disabled = !enabled;

  const isCustom = soundChoice.value === "custom";
  customRow.hidden = !isCustom;
  customName.textContent = customSound
    ? `Current file: ${customSoundName}`
    : "No file chosen yet, the default shutter sound is used.";
}

function preview() {
  playSound(currentSoundSettings()).catch(() =>
    showMessage("This sound could not be played", true),
  );
}

// ---- persistence ----

async function save() {
  const quality = parseInt(qualityInput.value, 10) || DEFAULT_SETTINGS.quality;
  await browser.storage.local.set({
    format: currentFormat(),
    quality,
    ...currentSoundSettings(),
  });
  updateQualityState();
  updateSoundState();
  showMessage("Saved");
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function load() {
  for (const [key, sound] of Object.entries(BUILTIN_SOUNDS)) {
    soundChoice.add(new Option(sound.label, key));
  }
  soundChoice.add(new Option("Custom file…", "custom"));

  const s = await browser.storage.local.get({
    ...DEFAULT_SETTINGS,
    showWelcome: false,
  });

  for (const radio of formatRadios) {
    radio.checked = radio.value === s.format;
  }
  qualityInput.value = s.quality;
  qualityValue.textContent = s.quality;

  customSound = s.customSound;
  customSoundName = s.customSoundName;
  soundEnabled.checked = s.soundEnabled;
  soundChoice.value = s.soundChoice;
  soundVolume.value = s.soundVolume;
  soundVolumeValue.textContent = `${s.soundVolume}%`;

  updateQualityState();
  updateSoundState();

  if (s.showWelcome) {
    welcome.hidden = false;
    // show the welcome message only once
    await browser.storage.local.set({ showWelcome: false });
  }
}

// ---- events ----

for (const radio of formatRadios) {
  radio.addEventListener("change", save);
}

qualityInput.addEventListener("input", () => {
  qualityValue.textContent = qualityInput.value;
});
qualityInput.addEventListener("change", save);

soundEnabled.addEventListener("change", save);

soundChoice.addEventListener("change", async () => {
  await save();
  preview();
});

soundVolume.addEventListener("input", () => {
  soundVolumeValue.textContent = `${soundVolume.value}%`;
});
soundVolume.addEventListener("change", async () => {
  await save();
  preview();
});

soundPreview.addEventListener("click", preview);

customFile.addEventListener("change", async () => {
  const file = customFile.files[0];
  if (!file) return;

  if (!file.type.startsWith("audio/")) {
    showMessage("Please choose an audio file", true);
  } else if (file.size > MAX_CUSTOM_SOUND_BYTES) {
    showMessage("The file is too large (max. 1 MB)", true);
  } else {
    try {
      customSound = await readAsDataURL(file);
      customSoundName = file.name;
      await save();
      preview();
    } catch {
      showMessage("The file could not be read", true);
    }
  }
  customFile.value = "";
});

dismissBtn.addEventListener("click", () => {
  welcome.hidden = true;
});

document.addEventListener("DOMContentLoaded", load);
