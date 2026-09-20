/*global browser */

function getMediaElementBy(id) {
  return document.querySelector('[tmcuuid="' + id + '"]');
}

// walks the DOM *and* into open shadow roots, since custom video-player
// web components (increasingly common) keep their <video>/<audio> inside
// a shadow tree where plain querySelectorAll can't see it. Closed shadow
// roots are inherently inaccessible to content scripts — not fixable here.
function collectMediaElements(root, out) {
  root.querySelectorAll("video, audio").forEach((el) => out.push(el));
  root.querySelectorAll("*").forEach((el) => {
    if (el.shadowRoot) {
      collectMediaElements(el.shadowRoot, out);
    }
  });
}

const getMediaElements = () => {
  const out = [];
  collectMediaElements(document, out);
  return out;
};

// true once the element has *something* to play, even if the browser
// hasn't fetched metadata yet (e.g. preload="none" audio that hasn't been
// touched) — used so such elements still show up instead of waiting on
// duration/readyState alone
function hasUsableSource(el) {
  return !!(
    el.currentSrc ||
    el.getAttribute("src") ||
    el.querySelector("source")
  );
}

// true if the media resource actually has an audio track. mozHasAudio is
// Firefox-specific (this is a Firefox-only extension) and only meaningful
// once metadata has loaded; audioTracks is a defensive fallback. Until we
// can actually tell, assume audio is present rather than wrongly disabling
// a control.
function elementHasAudio(el) {
  if (el.tagName.toLowerCase() !== "video") {
    // an <audio> element is definitionally audio
    return true;
  }
  if (el.readyState < 1) {
    return true;
  }
  if (typeof el.mozHasAudio === "boolean") {
    return el.mozHasAudio;
  }
  if (el.audioTracks) {
    return el.audioTracks.length > 0;
  }
  return true;
}

function getThumbnail(video) {
  try {
    const vw = video.videoWidth || 300;
    const vh = video.videoHeight || 200;
    // scale to fit within a 300x200 bounding box, preserving aspect ratio
    const scale = Math.min(300 / vw, 200 / vh, 1);
    let canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(vw * scale));
    canvas.height = Math.max(1, Math.round(vh * scale));
    let ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch (e) {
    // a cross-origin ("tainted") video source throws SecurityError on
    // toDataURL, and a frame that isn't decoded yet can throw too — either
    // way that's just no poster, not a reason to fail the whole query
    return "";
  }
}

// best-effort push notification so the popup can reflect play/pause/mute/
// rate changes the instant they happen on the page (someone hitting the
// site's own controls, an ad auto-playing, etc.) instead of waiting for the
// next poll. Rejects silently when nothing is listening (popup closed).
function notifyStateChange(el, id) {
  try {
    browser.runtime
      .sendMessage({
        cmd: "mediaStateChanged",
        id,
        playing: !el.paused,
        muted: el.muted,
        volume: el.volume,
        playbackRate: el.playbackRate,
        hasAudio: elementHasAudio(el),
      })
      .catch(() => {});
  } catch (e) {
    // extension context can go away mid-navigation; nothing to do
  }
}

const trackedElements = new WeakSet();

function trackElement(el, id) {
  if (trackedElements.has(el)) {
    return;
  }
  trackedElements.add(el);
  // loadedmetadata is included because mozHasAudio/audioTracks aren't
  // meaningful until then — this is what lets the popup flip a control
  // from "unknown, assume audio" to "confirmed silent" once the browser
  // actually knows
  ["play", "pause", "volumechange", "ratechange", "loadedmetadata"].forEach(
    (evt) => {
      el.addEventListener(evt, () => notifyStateChange(el, id));
    },
  );
}

function handleQuery(id, skipPoster) {
  const el = getMediaElementBy(id);
  if (!el) {
    // the page may have removed/replaced this element since the last
    // queryAll (SPA re-renders, an ad player tearing itself down, etc.) —
    // report "gone" instead of throwing on el.duration below
    return null;
  }

  const isVideo = el.tagName.toLowerCase() === "video";

  return {
    poster: skipPoster
      ? ""
      : isVideo
        ? el.readyState >= 2
          ? getThumbnail(el)
          : ""
        : "audio.png",
    duration: el.duration,
    currentTime: el.currentTime,
    playing: !el.paused,
    volume: el.volume,
    muted: el.muted,
    playbackRate: el.playbackRate,
    hasAudio: elementHasAudio(el),
    id,
  };
}

// get all media elements and their states
function handleQueryAll() {
  const ret = [];
  const els = getMediaElements();
  for (const el of els) {
    let tmcuuid = el.getAttribute("tmcuuid");
    if (tmcuuid === null) {
      tmcuuid = crypto.randomUUID();
      el.setAttribute("tmcuuid", tmcuuid);
    }
    trackElement(el, tmcuuid);

    const isVideo = el.tagName.toLowerCase() === "video";

    // include anything with metadata loaded (readyState >= 1) *or* anything
    // that at least has a source attached — a preload="none" <audio> the
    // user hasn't touched yet still has neither duration nor readyState,
    // but it's real media and shouldn't be invisible until played
    if (el.readyState >= 1 || hasUsableSource(el)) {
      ret.push({
        poster: isVideo && el.readyState >= 2 ? getThumbnail(el) : "",
        type: isVideo ? "video" : "audio",
        duration: el.duration,
        currentTime: el.currentTime,
        playing: !el.paused,
        volume: el.volume,
        muted: el.muted,
        playbackRate: el.playbackRate,
        hasAudio: elementHasAudio(el),
        id: tmcuuid,
      });
    }
  }

  return ret;
}

function handlePreview(id) {
  let el = getMediaElementBy(id);
  if (el) {
    return getThumbnail(el);
  }
  return "";
}

function handlePause(ids) {
  for (const id of ids) {
    let el = getMediaElementBy(id);
    if (el) {
      el.pause();
    }
  }
  return "play";
}

function handlePauseAll() {
  for (const el of getMediaElements()) {
    el.pause();
  }
}

function handleMuteAll() {
  for (const el of getMediaElements()) {
    el.muted = true;
  }
}

function handlePlay(ids) {
  for (const id of ids) {
    let el = getMediaElementBy(id);
    if (el) {
      // calling play() on an element that already reached the end resumes
      // from currentTime === duration, which just re-fires "ended"
      // immediately with nothing visibly playing. The spec says play()
      // should auto-seek to 0 in that case, but not every player (custom
      // MSE-backed ones especially, which can drop their buffer once
      // playback ends) honors that reliably — so force the rewind first.
      const atEnd =
        el.ended ||
        (isFinite(el.duration) &&
          el.duration > 0 &&
          el.currentTime >= el.duration - 0.05);
      if (atEnd) {
        try {
          el.currentTime = 0;
        } catch (e) {
          // some resources (still buffering, DRM-protected, etc.) can
          // refuse a manual seek — play() alone may still recover per spec
        }
      }
      el.play();
    }
  }
}

function handleMute(ids) {
  for (const id of ids) {
    let el = getMediaElementBy(id);
    if (el) {
      el.muted = true;
    }
  }
}

function handleUnMute(ids) {
  for (const id of ids) {
    let el = getMediaElementBy(id);
    if (el) {
      el.muted = false;
    }
  }
}

function handlePIP(ids) {
  for (const id of ids) {
    let el = getMediaElementBy(id);
    if (el) {
      // not supported ref. https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestPictureInPicture
      // and since bug https://bugzilla.mozilla.org/show_bug.cgi?id=1463402
      // is closed with WONTFIX, this feature wont be available any time soon it seems
      el.requestPictureInPicture();
    }
  }
}

async function handleFullscreen(id) {
  let el = getMediaElementBy(id);
  if (el) {
    try {
      el.requestFullscreen(); // not doable since action is not recognized as a short running user action
    } catch (e) {
      console.error(e);
    }
  }
}

async function handlePlaybackRate(id, playbackRate) {
  let el = getMediaElementBy(id);
  if (el) {
    try {
      el.playbackRate = playbackRate;
    } catch (e) {
      console.error(e);
    }
  }
}

async function handleVolume(id, volume) {
  let el = getMediaElementBy(id);
  if (el) {
    try {
      el.volume = volume;
    } catch (e) {
      console.error(e);
    }
  }
}

async function handleCurrentTime(id, currentTime) {
  let el = getMediaElementBy(id);
  if (el) {
    try {
      el.currentTime = currentTime;
    } catch (e) {
      console.error(e);
    }
  }
}

async function handleFocus(id) {
  let el = getMediaElementBy(id);
  if (el) {
    try {
      el.scrollIntoView();
    } catch (e) {
      console.error(e);
    }
  }
}
browser.runtime.onMessage.addListener((request) => {
  //console.debug("onMessage", JSON.stringify(request, null, 4));
  switch (request.cmd) {
    case "query":
      return Promise.resolve(handleQuery(request.id, request.skipPoster));
    case "queryAll":
      return Promise.resolve(handleQueryAll());
    case "play":
      return Promise.resolve(handlePlay(request.ids));
    case "pause":
      return Promise.resolve(handlePause(request.ids));
    case "pauseAll":
      return Promise.resolve(handlePauseAll());
    case "mute":
      return Promise.resolve(handleMute(request.ids));
    case "muteAll":
      return Promise.resolve(handleMuteAll());
    case "unmute":
      return Promise.resolve(handleUnMute(request.ids));
    case "pip":
      return Promise.resolve(handlePIP(request.ids));
    case "fullscreen":
      return Promise.resolve(handleFullscreen(request.ids));
    case "volume":
      return Promise.resolve(handleVolume(request.id, request.volume));
    case "playbackRate":
      return Promise.resolve(
        handlePlaybackRate(request.id, request.playbackRate),
      );
    case "currentTime":
      return Promise.resolve(
        handleCurrentTime(request.id, request.currentTime),
      );
    case "focus":
      return Promise.resolve(handleFocus(request.id));
    case "preview":
      return Promise.resolve(handlePreview(request.id));
    default:
      console.error("unknown request", request);
      break;
  }
});

setTimeout(() => {
  //console.debug("injecting media.js into document head ");
  var s = document.createElement("script");
  s.src = browser.runtime.getURL("attach.js");
  s.onload = () => s.remove();
  document.head.appendChild(s);
}, 3000);
