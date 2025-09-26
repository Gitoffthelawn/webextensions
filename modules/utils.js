/* global browser */

let isNumeric = (str) => {
  if (typeof str !== "string") {
    return false;
  } // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseInt(str))
  ); // ...and ensure strings of whitespace fail
};

let getTimeStampStr = () => {
  const d = new Date();
  let ts = "";
  [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate() + 1,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ].forEach((t, i) => {
    ts = ts + (i !== 3 ? "-" : "_") + (t < 10 ? "0" : "") + t;
  });
  return ts.substring(1);
};

let log = (level, msg) => {
  level = level.trim().toLowerCase();
  if (
    ["error", "warn"].includes(level) ||
    (isLoadedTemporary() && ["debug", "info", "log"].includes(level))
  ) {
    console[level](extname + "::" + level.toUpperCase() + "::" + msg);
    return;
  }
};

let sleep = (ms) => {
  new Promise((r) => setTimeout(r, ms));
};

let getRandomElementFromArray = (arr) => {
  return arr[Math.floor(Math.random() * items.length)];
};

let makeId = (length) => {
  var result = "";
  var characters = "0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

let isLoadedTemporary = () => {
  return browser.runtime.id.endsWith("@temporary-addon");
};

let getExtensionName = () => {
  const manifest = browser.runtime.getManifest();
  const extname = manifest.name;
  return extname;
};

let notify = async (
  title,
  message = "",
  aux = { iconUrl: "icon.png", msToClose: 3500 },
) => {
  const nid = await browser.notifications.create("" + Date.now(), {
    type: "basic",
    iconUrl: aux.iconUrl,
    title,
    message,
  });

  if (aux.msToClose > 0) {
    setTimeout(() => {
      browser.notifications.clear("" + nid);
    }, aux.msToClose);
  }
};

// interface
//export { getTimeStampStr, log, sleep, isNumeric, getRandomElementFromArray, makeId };

export {
  getTimeStampStr,
  log,
  sleep,
  isNumeric,
  getRandomElementFromArray,
  makeId,
  isLoadedTemporary,
  notify,
};
