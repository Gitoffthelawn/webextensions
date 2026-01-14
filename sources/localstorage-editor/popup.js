/* global browser Tabulator */

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

let table = null;
let tableData = null;

let TABID = parseInt(new URLSearchParams(window.location.search).get("tabId"));

const editDialog = document.getElementById("editDialog");
const confirmBtn = editDialog.querySelector("#confirmBtn");
const selectEl = editDialog.querySelector("select"); // store
const inputEl = editDialog.querySelector("input"); // key
const textareaEl = editDialog.querySelector("textarea"); // value
const wrapCheckboxEl = editDialog.querySelector('input[type="checkbox"]'); // key

let editorTempRow = null;

// button refs
const impbtn = document.getElementById("impbtn");
const savbtn = document.getElementById("savbtn");
const disbtn = document.getElementById("disbtn");
const expbtn = document.getElementById("expbtn");
const cpybtn = document.getElementById("cpybtn");
const delbtn = document.getElementById("delbtn");
const addbtn = document.getElementById("addbtn");
const log = document.getElementById("log");
const tip = document.getElementById("tip");

const tips = [
  "Duplicate items with Copy & Import",
  "Filter dont change selections",
  "Copy & Download act on selected items",
  "Imported items become selected",
  "Hover cells to show validation errors",
  "Reorder before Copy or Download",
  "Discard drops all not submitted changes",
  "Middle click the toolbar button to open it detached",
  "Double click on a value cell to open the row editor",
];

let validateAndHighlightTimer;

function delayedValidateAndHighlight(data) {
  clearTimeout(validateAndHighlightTimer);
  validateAndHighlightTimer = setTimeout(() => {
    table.validate();
    if (dataDifferentFromInital(data)) {
      highlightChange();
    } else {
      unhighlightChange();
    }
  }, 1000);
}

let logTimerId;

function showLogMessage(msg) {
  log.innerText = msg;
  clearTimeout(logTimerId);
  logTimerId = setTimeout(() => {
    log.innerText = "...";
  }, 5000);
}

function dataDifferentFromInital(newTableData) {
  if (tableData.length !== newTableData.length) {
    return true;
  }
  // now we need to compare alle elements
  let equalFound;
  for (const i of newTableData) {
    equalFound = false;
    for (const j of tableData) {
      if (i.store === j.store && i.key === j.key && i.value === j.value) {
        equalFound = true;
      }
    }
    if (!equalFound) {
      return true;
    }
  }
  return false;
}

function getTimeStampStr() {
  const d = new Date();
  let ts = "";
  [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ].forEach((t, i) => {
    ts = ts + (i !== 3 ? "-" : "_") + (t < 10 ? "0" : "") + t;
  });
  return ts.substring(1);
}

async function getTblData() {
  let data = [];
  try {
    data = (
      await browser.tabs.executeScript(TABID, {
        file: "getStorage.js",
      })
    )[0];
  } catch (e) {
    data = [];
  }
  return data;
}

function highlightChange() {
  savbtn.style.borderColor = "green";
  disbtn.style.borderColor = "red";
}

function unhighlightChange() {
  savbtn.style.borderColor = "";
  disbtn.style.borderColor = "";
}

// add new items
addbtn.addEventListener("click", async () => {
  table.deselectRow();
  table.addRow(
    {
      store: "",
      key: "",
      value: "",
    },
    true, // <- add at the top
  );
});

// delete selected items
delbtn.addEventListener("click", () => {
  table.deleteRow(table.getSelectedRows());
});

// discard changes / reload
disbtn.addEventListener("click", () => {
  window.location.reload();
});

// save/commit changes
savbtn.addEventListener("click", async () => {
  if (table.validate() !== true) {
    table.alert("Validation failed. Submit cancelled!", "error");
    setTimeout(function () {
      table.clearAlert();
    }, 2500);
    return;
  }
  const data = table.getData();
  browser.tabs.sendMessage(TABID, data);
  table.alert("Syncing Storage ... ", "msg");
  setTimeout(function () {
    window.location.reload(); // keep it simple
  }, 3000); // TODO: add a real mechanic to determine if/when sync is done
});

// export/download as file
expbtn.addEventListener("click", async () => {
  let selectedRows = table.getSelectedRows();
  // order the selected by position
  selectedRows.sort((a, b) => {
    return a.getPosition() - b.getPosition();
  });
  const expData = [];
  selectedRows.forEach((row) => {
    const rowData = row.getData();
    expData.push(rowData);
  });

  if (expData.length > 0) {
    const tab = await browser.tabs.get(TABID);
    const url = new URL(tab.url);

    const content = JSON.stringify(expData, null, 4);
    let dl = document.createElement("a");
    const href =
      "data:application/json;charset=utf-8," + encodeURIComponent(content);
    dl.setAttribute("href", href);
    dl.setAttribute(
      "download",
      "Storage Export " +
        getTimeStampStr() +
        " " +
        encodeURIComponent(url.hostname).replaceAll(".", "_") +
        ".json",
    );
    dl.setAttribute("visibility", "hidden");
    dl.setAttribute("display", "none");
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
    showLogMessage("Downloaded " + expData.length + " items");
  } else {
    showLogMessage("No items to download selected");
  }
});

// copy/export to clipboard
cpybtn.addEventListener("click", () => {
  let selectedRows = table.getSelectedRows();
  // order the selected by position
  selectedRows.sort((a, b) => {
    return b.getPosition() - a.getPosition();
  });
  const expData = [];
  selectedRows.forEach((row) => {
    const rowData = row.getData();
    expData.push(rowData);
  });
  if (expData.length > 0) {
    const content = JSON.stringify(expData, null, 4);
    navigator.clipboard.writeText(content);
  }
  if (expData.length > 0) {
    showLogMessage("Copied " + expData.length + " items to clipboard");
  } else {
    showLogMessage("No items to copy selected");
  }
});

// import from clipboard
impbtn.addEventListener("click", async () => {
  table.deselectRow();
  try {
    const clipText = await navigator.clipboard.readText();
    const config = JSON.parse(clipText);
    let import_count = 0;
    config.forEach((selector) => {
      if (
        typeof selector.store === "string" &&
        typeof selector.key === "string" &&
        typeof selector.value === "string"
      ) {
        table.addRow(
          {
            store: selector.store,
            key: selector.key,
            value: selector.value,
          },
          false,
        );
        import_count++;
      }
    });
    showLogMessage("Imported " + import_count + " items");
  } catch (e) {
    showLogMessage("Import failed: \n" + e.toString());
  }
});

function storeHeaderFilter(headerValue, rowValue /*, rowData, filterParams*/) {
  return headerValue.length < 1 || headerValue.includes(rowValue);
}

var uniqueKey = function (cell, value, parameters) {
  let tmp;
  for (let row of table.getData()) {
    if (row.key === value) {
      if (tmp === row.store) {
        return false; // find the same thing again
      } else {
        tmp = row.store; // find itself  or something else
      }
    }
  }
  return true;
};

/*
// when it contains linebreaks, we go into full editor mode
var editCheck = function (cell) {
  return cell.getValue().split(/\r\n|\r|\n/).length < 10;
};
*/

async function onDOMContentLoaded() {
  if (isNaN(TABID)) {
    TABID = (await browser.tabs.query({ currentWindow: true, active: true }))[0]
      .id;
  }

  tip.innerText = "Tip: " + tips[Math.floor(Math.random() * tips.length)];

  table = new Tabulator("#mainTable", {
    autoColumns: true,
    height: "460px",
    columnDefaults: {
      resizable: false,
    },
    placeholder: "No items",
    //layout: "fitDataStretch",
    layout: "fitColumns",
    pagination: false,
    movableRows: true,
    validationMode: "highlight",
    headerSortClickElement: "icon",
    initialSort: [
      { column: "key", dir: "asc" },
      { column: "store", dir: "asc" },
    ],
    resizableColumnFit: true,
    columns: [
      {
        formatter: "handle",
        frozen: true,
        headerSort: false,
        hozAlign: "center",
        rowHandle: true,
        width: 10,
      },
      {
        formatter: "rowSelection",
        frozen: true,
        headerSort: false,
        hozAlign: "center",
        headerHozAlign: "center",
        titleFormatter: "rowSelection",
        width: 10,
        titleFormatterParams: {
          rowRange: "active", //only toggle the values of the active filtered rows
        },
        cellClick: (e, cell) => {
          cell.getRow().toggleSelect();
        },
      },
      {
        title: '<abbr title="Storage Area">SA</abbr>',
        field: "store",
        frozen: true,
        width: 60,
        hozAlign: "center",
        headerFilter: "list",
        editor: "list",
        editorParams: { values: ["Local", "Session"] },
        headerFilterPlaceholder: "Filter",
        cellMouseOver: function (e, cell) {
          const valid = cell.validate();
          if (valid !== true) {
            showLogMessage(
              "Cell Validation Errors: " + valid.map((el) => el.type).join(","),
            );
          }
        },
        headerFilterFunc: storeHeaderFilter,
        headerFilterParams: {
          clearable: true,
          values: ["Local", "Session"],
          multiselect: true,
        },
        validator: ["in:Local|Session", "required"],
        formatter: function (cell, formatterParams, onRendered) {
          //cell - the cell component
          //formatterParams - parameters set for the column
          //onRendered - function to call when the formatter has been rendered
          const val = cell.getValue();
          if (["Session", "Local"].includes(val)) {
            return '<abbr title="' + val + '" >' + val[0] + "</abbr>";
          }
          return "";
        },
      },

      /*
      {
        title: "",
        field: "ksize",
        headerSort: true,
        hozAlign : "right",
      },
    */
      {
        title: "Key",
        field: "key",
        resizable: "header",
        headerSort: true,
        widthGrow: 2,
        validator: [
          "required",
          {
            type: uniqueKey,
            parameters: { errmsg: "not unique" },
          },
        ],
        cellMouseOver: function (e, cell) {
          // show key-value on hover via title attribute
          const cellElement = cell.getElement();
          cellElement.setAttribute("title", cell.getValue());

          const valid = cell.validate();
          if (valid !== true) {
            showLogMessage(
              "Cell Validation Errors: " +
                valid
                  .map((el) => {
                    if (el.type === "function") {
                      return el.parameters.errmsg;
                    }
                    return el.type;
                  })
                  .join(","),
            );
          }
        },
        headerFilter: "input",
        headerFilterPlaceholder: "Filter",
        formatter: "plaintext",
        editor: "input",
        editorParams: {
          elementAttributes: {
            spellcheck: "false",
          },
          selectContents: true,
          shiftEnterSubmit: true,
        },
        /*
        cellEdited: function (cell) {
          // update the size column
          cell.getRow().update({ ksize: cell.getValue().length });
        },
        */
      },

      {
        title: "Value",
        field: "value",
        widthGrow: 4,
        headerFilter: "input",
        headerFilterPlaceholder: "Filter",
        editor: "textarea",
        //editable: editCheck,
        editorParams: {
          elementAttributes: {
            spellcheck: "false",
            wrap: "off",
          },
          verticalNavigation: "hybrid",
          variableHeight: true,
          shiftEnterSubmit: true,
          selectContents: true,
        },
        formatter: "plaintext",
        /**/
        cellDblClick: function (e, cell) {
          //if(!editCheck(cell)){
          editDialog.showModal();
          editDialog.focus(); // focus something else first !!
          const rowData = cell.getRow().getData();
          editorTempRow = cell.getRow();
          textareaEl.value = rowData.value;
          selectEl.value = rowData.store;
          inputEl.value = rowData.key;
          textareaEl.focus();
          textareaEl.setSelectionRange(0, 0);
          //}
        },
        cellEdited: function (cell) {
          // update the size column
          cell.getRow().update({ vsize: cell.getValue().length });
        },

        cellMouseOver: function (e, cell) {
          cell.getElement().setAttribute("title", cell.getValue());
        },
        /**/
      },
      {
        title: '<abbr title="Value Length">VL</abbr>',
        field: "vsize",
        headerSort: true,
        hozAlign: "left",
        frozen: true,
        minWidth: 50,
        cellMouseOver: function (e, cell) {
          cell.getElement().setAttribute("title", cell.getValue());
        },
      },
    ],
  });

  /**
   * Register Table Events
   */
  const checkState = await getFromStorage("boolean", "checkState", false);

  // after adding a row highlight/select it
  table.on("rowAdded", function (row) {
    row.select();
  });

  // load data
  table.alert("Loading data");
  const data = await getTblData();
  data.forEach(async (e, index) => {
    e["vsize"] = e.value.length;
    //e['ksize'] = e.key.length;
    table.addRow(e, true);

    // after processing the last element
    if (index === data.length - 1) {
      if (!checkState) {
        // when unchecked, deselect everything after inital load
        table.deselectRow();
      }
    }
  });

  table.clearAlert();

  tableData = table.getData();

  // do this after the inital data load
  // hlchange any values changed
  // and call validate afterwards
  table.on("dataChanged", function (data) {
    delayedValidateAndHighlight(data);
  });

  confirmBtn.addEventListener("click", (event) => {
    event.preventDefault(); // dont submit fake form

    editorTempRow.update({
      store: selectEl.value,
      key: inputEl.value,
      value: textareaEl.value,
      vsize: textareaEl.value.length,
      //ksize: inputEl.value.length,
    });

    editDialog.close();
  });

  //table.getColumn("store").setHeaderFilterValue(["Local","Session"]);

  wrapCheckboxEl.addEventListener("click", (evt) => {
    if (evt.target.checked) {
      textareaEl.style.whiteSpace = "nowrap";
    } else {
      textareaEl.style.whiteSpace = "wrap";
    }
  });
} // onDOMContentLoaded

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

["checkState"].map((id) => {
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
      } else {
        el.value = 0;
      }
    })
    .catch(console.error);

  let el = document.getElementById(id);
  el.addEventListener("input", onChange);
});

// init
document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
