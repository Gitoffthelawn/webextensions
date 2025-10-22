/* global browser */

async function onDOMContentLoaded() {
  let noURLParamsFunction = document.getElementById("noURLParamsFunction");
  let reset = document.getElementById("reset");

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
    { id: "noURLParamsFunction", type: "string" },
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

  reset.addEventListener("click", async () => {
    if (
      !confirm(
        "Are you sure?\nThe current data will be lost when you click on ok.",
      )
    ) {
      return;
    }

    let tmp = await fetch(browser.runtime.getURL("noURLParamsFunction.js"));
    tmp = await tmp.text();
    noURLParamsFunction.value = tmp;
    storage.set("noURLParamsFunction", tmp);
  });
}

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
