/* global browser */

Date.prototype.toDateInputValue = function () {
  var local = new Date(this);
  local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
  return local.toJSON().slice(0, 10);
};

function onChange(evt) {
  let id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;
  let obj = {};

  //console.log(id,value, el.type);

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
  } else if (el.type === "date") {
    if (value === "") {
      value = new Date().toDateInputValue();
    }
  }

  //console.log(id, value);
  obj[id] = value;

  //console.log(id,value);
  browser.storage.local.set(obj).catch(console.error);
}

["enddate", "name"].map((id) => {
  browser.storage.local
    .get(id)
    .then((obj) => {
      let el = document.getElementById(id);
      let val = obj[id];

      if (typeof val !== "undefined") {
        if (el.type === "checkbox") {
          el.checked = val;
        } else if (el.type === "date") {
          el.min = new Date().toDateInputValue();
          if (val !== "") {
            el.value = val;
          }
        } else {
          el.value = val;
        }
      }
    })
    .catch((err) => {
      console.error(err);
    });

  let el = document.getElementById(id);
  el.addEventListener("change", onChange);
  if (el.type === "text") {
    el.addEventListener("keyup", onChange);
  }
});
