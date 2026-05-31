/* global browser */

async function onDOMContentLoaded() {
  const storage = await import("./storage.js");

  function onChange(evt) {
    let id = evt.target.id;
    let el = document.getElementById(id);

    let value = el.type === "checkbox" ? el.checked : el.value;
    //let obj = {};

    if (value === "") {
      return;
    }
    if (el.type === "number") {
      try {
        value = parseInt(value);
        if (isNaN(value)) {
          value = el.min;
        }
        if (value < el.min) {
          value = el.min;
        }
      } catch (e) {
        value = el.min;
      }
    }

    storage.set(id, value);
  }

  [
    /* add individual settings here */
    { id: "allowedParams", type: "string" },
    { id: "popupmode", type: "boolean" },
  ].map(async (obj) => {
    let el = document.getElementById(obj.id);
    let val = await storage.get(obj.type, obj.id, undefined);

    if (typeof val !== "undefined") {
      if (el.type === "checkbox") {
        el.checked = val;
      } else {
        el.value = val;
      }
    }

    el.addEventListener("input", onChange);
  });
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
