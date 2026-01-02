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

let editorTempCell = null;

// button refs
const impbtn = document.getElementById("impbtn");
const savbtn = document.getElementById("savbtn");
const disbtn = document.getElementById("disbtn");
const expbtn = document.getElementById("expbtn");
const cpybtn = document.getElementById("cpybtn");
const delbtn = document.getElementById("delbtn");
const addbtn = document.getElementById("addbtn");
//const detachbtn = document.getElementById("detachbtn");
const log = document.getElementById("log");
const tip = document.getElementById("tip");

const tips = [
  "Use Copy & Import to quickly duplicate items",
  "Filtering doenst not change the item selection",
  "Copy & Download actions only take selected items into account",
  "Imported items get autoselected",
  "Cell validation erros get shown, when hovering over a cell",
  "Use the row handle to reorder rows to copy or download them",
  "Discard will drop all all not submitted changes and reload values from storage",
  "Double Click a Value Cell to open it in a larger view",
  "Middle Click on the toolbar icon to open the editor in a separate window",
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
  //const newTableData = table.getData();

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
    data = await browser.tabs.executeScript(TABID, {
      file: "getStorage.js",
    });
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
    true,
  ); // add at the top
  //highlightChange();
});

// delete selected items
delbtn.addEventListener("click", () => {
  //let changed = false;
  /*
    table.getSelectedRows().forEach( (row) =>  {
	row.delete();
	//changed = true;
    });
	*/
  table.deleteRow(table.getSelectedRows());
  /*
    if(changed){
	highlightChange();
    }
    */
});

// discard changes / reload
disbtn.addEventListener("click", () => {
  window.location.reload();
});

/*
detachbtn.addEventListener("click", async () => {
  const related_tab = await browser.tabs.get(TABID);

  browser.windows.create({
    height: 460,
    width: 840,
    titlePreface: new URL(related_tab.url).hostname,
    type: "popup",
    url: "popup.html?tabId=" + TABID,
  });

  window.close();
});
*/

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
  /*const tabs = await browser.tabs.query({
    currentWindow: true,
    active: true,
  });*/
  //browser.tabs.sendMessage(tabs[0].id, data);
  browser.tabs.sendMessage(TABID, data);
  //unhighlightChange();
  table.alert("Syncing Storage ... ", "msg");
  setTimeout(function () {
    //table.clearAlert();
    window.location.reload(); // keep it simple
  }, 1000);
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
    /*
		if(import_count  > 0) {
		    highlightChange();
		}
		*/
    showLogMessage("Imported " + import_count + " items");
  } catch (e) {
    showLogMessage("Import failed: \n" + e.toString());
  }
});

function storeHeaderFilter(headerValue, rowValue /*, rowData, filterParams*/) {
  return headerValue.length < 1 || headerValue.includes(rowValue);
}

var uniqueKey = function (cell, value, parameters) {
  //cell - the cell component for the edited cell
  //value - the new input value of the cell
  //parameters - the parameters passed in with the validator

  //return value % parameters.divisor; //don't allow values divisible by divisor ;

  //const val = cell.getValue();
  let tmp; // undefined

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
//custom formatter definition
var printIcon = function (cell, formatterParams, onRendered) {
  //plain text value
  return "<i class='fa fa-print'></i>";
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
    /*height: "460px",*/
    //virtualDomBuffer:99999, //set virtual DOM buffer to 300px
    //renderVertical:"basic", //disable virtual DOM rendering
    //virtualDom:false, // also disable virtual DOM rending ??? wtf
    height: "100%",
    maxHeight: "100%",
    //virtualDom: false,
    placeholder: "No items found",
    layout: "fitDataStretch",
    pagination: false,
    movableRows: true,
    validationMode: "highlight",
    initialSort: [
      { column: "key", dir: "asc" },
      { column: "store", dir: "asc" },
    ],
    columns: [
      {
        rowHandle: true,
        formatter: "handle",
        headerSort: false,
        frozen: true,
        width: 30,
        minWidth: 30,
      },
      {
        formatter: "rowSelection",
        titleFormatter: "rowSelection",
        titleFormatterParams: {
          rowRange: "active", //only toggle the values of the active filtered rows
        },
        hozAlign: "left",
        headerSort: false,
        cellClick: (e, cell) => {
          cell.getRow().toggleSelect();
        },
        width: 30,
        minWidth: 30,
      },
      {
        title: "Storage",
        field: "store",
        cellMouseOver: function (e, cell) {
          //e - the event object
          //cell - cell component
          const valid = cell.validate();
          if (valid !== true) {
            showLogMessage(
              "Cell Validation Errors: " + valid.map((el) => el.type).join(","),
            );
          }
        },
        hozAlign: "left",
        headerFilter: "list",
        editor: "list",
        editorParams: { values: ["Local", "Session"] },
        headerFilterPlaceholder: "Select",
        headerFilterFunc: storeHeaderFilter,
        headerFilterParams: {
          values: ["Local", "Session"],
          verticalNavigation: "hybrid",
          multiselect: true,
        },
        validator: ["in:Local|Session", "required"],
      },
      {
        title: "Key",
        field: "key",
        validator: [
          "required",
          {
            type: uniqueKey,
            parameters: { errmsg: "not unique" },
          },
        ],
        cellMouseOver: function (e, cell) {
          //e - the event object
          //cell - cell component
          const valid = cell.validate();
          if (valid !== true) {
            //console.debug(JSON.stringify(valid,null,4));
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
        width: "25%",
        headerFilter: "input",
        headerFilterPlaceholder: "Filter",
        editor: "input",
        editorParams: {
          elementAttributes: {
            spellcheck: "false",
          },
        },
      },

      /*
      {
        formatter: printIcon,
        width: 40,
        hozAlign: "center",
        cellClick: function (e, cell) {
          //alert("Printing row data for: " + cell.getRow().getData().name);

          const row = cell.getRow();

          const value_cell = row.getCell(5);

          editorTempCell = value_cell;
          const rowData = row.getData();
          textareaEl.value = rowData.value;
          selectEl.value = rowData.store;
          inputEl.value = rowData.key;
          editDialog.showModal();
          textareaEl.focus();
          textareaEl.setSelectionRange(0, 0);
        },
      },
        */
      {
        title: "Value",
        field: "value",
        headerFilter: "input",
        headerFilterPlaceholder: "Filter",
        editor: "textarea",
        editorParams: {
          elementAttributes: {
            spellcheck: "false",
          },
          verticalNavigation: "editor",
          variableHeight: true,
          shiftEnterSubmit: true,
        },
        formatter: "plaintext",
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
  const data = await getTblData();
  data.forEach(async (e, index) => {
    table.addRow(e, true);

    // after processing the last element
    if (index === data.length - 1) {
      if (!checkState) {
        // when unchecked, deselect everything after inital load
        table.deselectRow();
      }
    }
  });

  tableData = table.getData();

  // do this after the inital data load
  // hlchange any values changed
  // and call validate afterwards
  table.on("dataChanged", function (data) {
    //data - the updated table data
    delayedValidateAndHighlight(data);
    /*
	setTimeout(() => { table.validate() }, 1000);
	if(dataDifferentFromInital(data)){
		highlightChange();
	}else{
		unhighlightChange();
	}
	*/
  });

  table.on("cellDblClick", function (e, cell) {
    //e - the click event object
    //cell - cell component
    //e - the click event object
    //row - row component
    const field = cell.getField();

    if (field === "value") {
      editorTempCell = cell;
      const rowData = cell.getRow().getData();
      textareaEl.value = rowData.value;
      selectEl.value = rowData.store;
      inputEl.value = rowData.key;
      editDialog.showModal();
      textareaEl.focus();
      textareaEl.setSelectionRange(0, 0);
    }
  });

  // "Cancel" button closes the dialog without submitting because of [formmethod="dialog"], triggering a close event.
  /*
    editDialog.addEventListener("close", (e) => {
        //if(editDialog.returnValue !== "default")
        //console.debug(editDialog.returnValue);
    });
    */

  // Prevent the "confirm" button from the default behavior of submitting the form, and close the dialog with the `close()` method, which triggers the "close" event.
  confirmBtn.addEventListener("click", (event) => {
    event.preventDefault(); // We don't want to submit this fake form
    editorTempCell.setValue(textareaEl.value, true);
    editDialog.close(); // Have to send the select box value here.
  });
}

function onChange(evt) {
  let id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;
  let obj = {};

  //console.log(id,value, el.type,el.min);
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

  //console.log(id, value);
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

  /*browser.runtime.onMessage.addListener((data, sender) => {
    console.debug(data, sender);
    document.getElementById(data.cmd).click();
  });*/
});

// init
document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
