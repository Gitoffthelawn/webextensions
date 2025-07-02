/*global browser */

(async function () {
  const impbtnWrp = document.getElementById("impbtn_wrapper");
  const impbtn = document.getElementById("impbtn");
  const expbtn = document.getElementById("expbtn");
  const manifest = browser.runtime.getManifest();
  const extname = manifest.name;

  expbtn.addEventListener("click", async () => {
    let dl = document.createElement("a");
    let res = await browser.storage.local.get("list");
    let content = "[]";
    if (typeof res !== "undefined") {
      if (typeof res.list !== "undefined") {
        content = JSON.stringify(res.list, null, 4);
      }
    }
    dl.setAttribute(
      "href",
      "data:application/json;charset=utf-8," + encodeURIComponent(content)
    );
    dl.setAttribute("download", "origins.json");
    dl.setAttribute("visibility", "hidden");
    dl.setAttribute("display", "none");
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
  });

  // delegate to real Import Button which is a file selector
  impbtnWrp.addEventListener("click", function (evt) {
    impbtn.click(evt);
  });

  impbtn.addEventListener("input", () => {
    let file = impbtn.files[0];
    let reader = new FileReader();
    reader.onload = async () => {
      const data = JSON.parse(reader.result);
      await browser.storage.local.set({ list: data });
      browser.notifications.create(extname, {
        title: extname,
        type: "basic",
        iconUrl: "icon.png",
        message: "Imported " + data.length + " origins",
      });
    };
    reader.readAsText(file);
  });

  function onChange(evt) {
    let id = evt.target.id;
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

    obj[id] = value;

    browser.storage.local.set(obj).catch(console.error);
  }

  ["mode"].map((id) => {
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
      .catch((err) => {
        console.error(err);
      });

    let el = document.getElementById(id);
    el.addEventListener("change", onChange);
  });
})();
