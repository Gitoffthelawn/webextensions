/* global browser */

let storage;

function onChange(evt) {
  let id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;

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

async function onLoad() {
  storage = await import("./storage.js");
  ["subdomain_list", "subdomain_list_mode"].map(async (id) => {
    try {
      let el = document.getElementById(id);
      let val;

      if (el.type === "checkbox") {
        val = await storage.get("boolean", id, false);
        el.checked = val;
      } else {
        val = await storage.get("string", id, "");
        el.value = val;
      }
    } catch (e) {
      console.error(e);
    }
  });

  document.getElementById("savebtn").addEventListener("click", () => {
    ["subdomain_list", "subdomain_list_mode"].forEach((id) => {
      let el = document.getElementById(id);

      let value = el.type === "checkbox" ? el.checked : el.value;
      let obj = {};

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

      //obj[id] = value;
      storage.set(id, value);
    });
  });
}

document.addEventListener("DOMContentLoaded", onLoad);
