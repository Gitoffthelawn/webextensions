/*global browser */

let storage;

function onChange(evt) {
  const id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;
  if (typeof value === "string") {
    value = value.trim(); // strip whitespace
  }
  storage.set(id, value);
}

async function onLoad() {
  storage = await import("./storage.js");
  [
    { id: "matchers", type: "string", fallback: "" },
    { id: "mode", type: "boolean", fallback: false },
  ].forEach(async (elobj) => {
    let val = await storage.get(elobj.id, elobj.type, elboj.fallback);
    let el = document.getElementById(elobj.id);

    switch (elobj.type) {
      case "boolean":
        el.checked = val;
        el.addEventListener("click", onChange);
        break;
      case "string":
        el.value = val;
        el.addEventListener("input", onChange);
        break;
      default:
        break;
    }
  });
}

document.addEventListener("DOMContentLoaded", onLoad);
