/* global browser */
/* eslint-disable no-useless-escape */

(function () {
  if (typeof window.tbl2csv_hasRun !== "undefined") {
    return;
  }
  window.tbl2csv_hasRun = true;

  let tableStyleSheet = document.createElement("style");
  document.head.appendChild(tableStyleSheet);
  const highlightCSS = `.divTbl, table { border: 3px dotted red !important; padding:1px !important; margin:1px !important; }`;
  tableStyleSheet.sheet.insertRule(highlightCSS, 0);
  tableStyleSheet.disabled = true;

  const separator = ",";
  const CRLF = "\r\n";

  // consts
  const re_quote = new RegExp('"', "gm");
  const re_hspace = new RegExp(/[ \t]+/, "gm"); // horizontal whitespace only; real line breaks are preserved
  const tblrowdsps = ["table-row", "table-header-group", "table-footer-group"];

  const convert = {
    div: div2csv,
    table: table2csv,
  };

  // `mode` is now passed explicitly instead of read from shared module state,
  // so concurrent exports in the same tab can never interfere with each other.
  function getDataFromNode(node, mode) {
    let data = mode.endsWith("html") ? node.innerHTML : node.textContent;
    if (mode.endsWith("html")) {
      // preserve HTML formatting/whitespace as-is; only escape quotes for CSV
      return data.replace(re_quote, '""');
    }
    // text mode: collapse repeated spaces/tabs but keep real line breaks -
    // a literal line break inside a quoted CSV field is valid per RFC 4180,
    // whereas replacing it with a space silently destroys information.
    return data.replace(re_hspace, " ").trim().replace(re_quote, '""');
  }

  function closestDivAncestorWithDisplay(node, displays) {
    let n = node.parentElement;
    while (n) {
      if (displays.includes(getStyle(n, "display"))) {
        return n;
      }
      n = n.parentElement;
    }
    return null;
  }

  function div2csv(tbl, mode) {
    let csv = [];
    tbl.querySelectorAll("div").forEach((tr) => {
      if (!tblrowdsps.includes(getStyle(tr, "display"))) {
        return;
      }
      // skip rows that actually belong to a nested div-table, so a
      // div-table-within-a-div-table doesn't get exported twice
      if (!tbl.isSameNode(closestDivAncestorWithDisplay(tr, ["table"]))) {
        return;
      }
      let row = [];
      tr.querySelectorAll("div").forEach((td) => {
        if (getStyle(td, "display") !== "table-cell") {
          return;
        }
        // skip cells that belong to a nested row
        if (!tr.isSameNode(closestDivAncestorWithDisplay(td, tblrowdsps))) {
          return;
        }
        const data = getDataFromNode(td, mode);
        row.push('"' + data + '"');
      });
      if (row.length > 0) {
        csv.push(row.join(separator));
      }
    });
    return csv.join(CRLF);
  }

  function table2csv(tbl, mode) {
    let csv = [];
    const activeRowSpans = {}; // colIndex -> { remaining, value }

    tbl.querySelectorAll("tr").forEach((tr) => {
      // skip rows in subtables
      if (!tbl.isSameNode(tr.closest("table"))) {
        return;
      }

      let row = [];
      let colIndex = 0;

      function consumePendingRowSpans() {
        while (activeRowSpans[colIndex]) {
          row[colIndex] = activeRowSpans[colIndex].value;
          activeRowSpans[colIndex].remaining--;
          if (activeRowSpans[colIndex].remaining <= 0) {
            delete activeRowSpans[colIndex];
          }
          colIndex++;
        }
      }

      // fill in any columns still spanned by a rowspan from a previous row
      consumePendingRowSpans();

      tr.querySelectorAll("td, th").forEach((td) => {
        consumePendingRowSpans();

        const data = '"' + getDataFromNode(td, mode) + '"';
        const colspan = parseInt(td.getAttribute("colspan"), 10) || 1;
        const rowspan = parseInt(td.getAttribute("rowspan"), 10) || 1;

        row[colIndex] = data;
        if (rowspan > 1) {
          activeRowSpans[colIndex] = { remaining: rowspan - 1, value: "" };
        }
        colIndex++;

        // colspan padding (blank cells); carry the rowspan onto padded columns too
        for (let i = 1; i < colspan; i++) {
          consumePendingRowSpans();
          row[colIndex] = "";
          if (rowspan > 1) {
            activeRowSpans[colIndex] = { remaining: rowspan - 1, value: "" };
          }
          colIndex++;
        }
      });

      // skip rows without cells
      if (row.length > 0) {
        csv.push(row.join(separator));
      }
    });
    return csv.join(CRLF);
  }

  function getClosestExportableParent(node) {
    while (node !== null && typeof node.tagName === "string") {
      const tag = node.tagName.toLowerCase();
      if (
        (tag === "div" && getStyle(node, "display") === "table") ||
        tag === "table"
      ) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function highlightDivTables() {
    document.querySelectorAll("div").forEach((div) => {
      if (getStyle(div, "display") === "table") {
        if (!div.classList.contains("divTbl")) {
          div.classList.add("divTbl");
        }
      }
    });
  }

  function getStyle(node, attr) {
    return window.getComputedStyle(node, null)[attr];
  }

  // register message listener

  browser.runtime.onMessage.addListener(async (message) => {
    //console.debug(message);
    if (message.action === "highlight") {
      if (tableStyleSheet.disabled) {
        highlightDivTables();
        tableStyleSheet.disabled = false;
      } else {
        tableStyleSheet.disabled = true;
      }
    }

    if (message.action === "export") {
      const mode = message.mode;

      const clickTarget = browser.menus.getTargetElement(
        message.targetElementId,
      );
      if (clickTarget !== null) {
        const exportableTarget = getClosestExportableParent(clickTarget);
        if (exportableTarget !== null) {
          return convert[exportableTarget.tagName.toLowerCase()](
            exportableTarget,
            mode,
          );
        }
      }
      return "No exportable target found!\nHint: Click the toolbar icon to highlight exportable targets";
    }
  });
})();
