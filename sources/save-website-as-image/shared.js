/* global browser */

// Settings + sound helpers shared by background.js and options.js

const DEFAULT_SETTINGS = {
  format: "jpeg",
  quality: 90,
  soundEnabled: true,
  soundChoice: "shutter",
  soundVolume: 70,
  customSound: "", // data: URL of a user supplied audio file
  customSoundName: "",
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
