/* global browser */

function onChange(evt) {
  let id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;
  let obj = {};

  if (value === "") {
    return;
  }
  if (el.type === "number") {
    const min = Number(el.min);
    try {
      value = parseInt(value);
      if (isNaN(value)) {
        value = min;
      }
      if (value < min) {
        value = min;
      }
    } catch (e) {
      value = min;
    }
  }

  obj[id] = value;

  browser.storage.local.set(obj).catch(console.error);
}

[
  "saveMode",
  "qrPadding",
  "qrSize",
  "qrecl",
  "bgcolor",
  "fgcolor",
  "bgalpha",
  "fgalpha",
].map((id) => {
  browser.storage.local
    .get(id)
    .then((obj) => {
      let el = document.getElementById(id);
      let val = obj[id];

      if (typeof val !== "undefined") {
        if (el.type === "checkbox") {
          el.checked = val;
        } else {
          el.value = val;
        }
      }
    })
    .catch(console.error);

  let el = document.getElementById(id);
  el.addEventListener("input", onChange);
});
