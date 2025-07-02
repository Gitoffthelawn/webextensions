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
  obj[id] = value;
  browser.storage.local.set(obj).catch(console.error);
}

function deleteRow(rowTr) {
  var mainTableBody = document.getElementById("mainTableBody");
  mainTableBody.removeChild(rowTr);
}

function createTableRow(feed) {
  var mainTableBody = document.getElementById("mainTableBody");
  var tr = mainTableBody.insertRow();
  tr.style = "vertical-align:top;";

  Object.keys(feed)
    .sort()
    .forEach((key) => {
      var input;
      if (key === "activ") {
        input = document.createElement("input");
        input.className = key;
        input.placeholder = key;
        input.style.width = "99%";
        input.type = "checkbox";
        input.checked = typeof feed[key] === "boolean" ? feed[key] : true;
        tr.insertCell().appendChild(input);
      } else if (key === "code") {
        input = document.createElement("textarea");
        input.className = key;
        input.placeholder = key;
        input.style.width = "98%";
        //input.style.height= '1em';
        input.style.height = "1em";
        input.addEventListener("focus", function () {
          this.style.height = "";
          this.style.height = this.scrollHeight + "px";
        });
        input.addEventListener("focusout", function () {
          //this.style.height = "";this.style.height = this.scrollHeight + "px";
          input.style.height = "1em";
        });
        input.value = feed[key];
        tr.insertCell().appendChild(input);
      } else if (key === "url_regex") {
        input = document.createElement("input");
        input.className = key;
        input.placeholder = key;
        input.style.width = "99%";
        input.value = feed[key];
        tr.insertCell().appendChild(input);
      }
    });

  var button;
  if (feed.action === "save") {
    button = createButton("Add", "saveButton", function () {}, true);
  } else {
    button = createButton(
      "Delete",
      "deleteButton",
      function () {
        deleteRow(tr);
      },
      false,
    );
  }
  tr.insertCell().appendChild(button);
}

function collectConfig() {
  // collect configuration from DOM
  var mainTableBody = document.getElementById("mainTableBody");
  var feeds = [];
  for (var row = 0; row < mainTableBody.rows.length; row++) {
    try {
      var url_regex = mainTableBody.rows[row]
        .querySelector(".url_regex")
        .value.trim();
      var ses = mainTableBody.rows[row].querySelector(".code").value.trim();
      var check = mainTableBody.rows[row].querySelector(".activ").checked;
      if (url_regex !== "" && ses !== "") {
        feeds.push({
          activ: check,
          code: ses,
          url_regex: url_regex,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
  return feeds;
}

function createButton(text, id, callback, submit) {
  var span = document.createElement("span");
  var button = document.createElement("button");
  button.id = id;
  button.textContent = text;
  button.className = "browser-style";
  button.style.width = "99%";
  if (submit) {
    button.type = "submit";
  } else {
    button.type = "button";
  }
  button.name = id;
  button.value = id;
  button.addEventListener("click", callback);
  span.appendChild(button);
  return span;
}

async function saveOptions() {
  var config = collectConfig();
  //config = sanatizeConfig(config);
  await browser.storage.local.set({ selectors: config });
}

async function restoreOptions() {
  createTableRow({
    activ: 1,
    code: "",
    url_regex: "",
    action: "save",
  });
  var res = await browser.storage.local.get("selectors");
  if (!Array.isArray(res.selectors)) {
    return;
  }
  res.selectors.forEach((selector) => {
    selector.action = "delete";
    createTableRow(selector);
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

const impbtnWrp = document.getElementById("impbtn_wrapper");
const impbtn = document.getElementById("impbtn");
const expbtn = document.getElementById("expbtn");

expbtn.addEventListener("click", async function () {
  var dl = document.createElement("a");
  var res = await browser.storage.local.get("selectors");
  var content = JSON.stringify(res.selectors, null, 4);
  dl.setAttribute(
    "href",
    "data:application/json;charset=utf-8," + encodeURIComponent(content),
  );
  dl.setAttribute("download", "data.json");
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
});

// delegate to real Import Button which is a file selector
impbtnWrp.addEventListener("click", function () {
  impbtn.click();
});

impbtn.addEventListener("input", function () {
  var file = this.files[0];
  var reader = new FileReader();
  reader.onload = async function () {
    try {
      var config = JSON.parse(reader.result);
      await browser.storage.local.set({ selectors: config });
      document.querySelector("form").submit();
    } catch (e) {
      console.error("error loading file: " + e);
    }
  };
  reader.readAsText(file);
});
