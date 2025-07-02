/* global browser */

const manifest = browser.runtime.getManifest();
const extname = manifest.name;

function readBlob(b) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onloadend = function () {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(b);
  });
}

browser.menus.create({
  id: extname,
  title: "Copy as Data URL",
  documentUrlPatterns: ["<all_urls>"],
  contexts: ["image"],
  onclick: async function (info, tab) {
    if (info.srcUrl) {
      const response = await fetch(info.srcUrl);
      const blob = await response.blob();
      const content = await readBlob(blob);

      //navigator.clipboard.writeText(content);
        browser.tabs.executeScript(tab.id, {
            code: `prompt("Image DataURL", "${content}");`,
        });

    }
    /*
        // this seems nice, but has some issues with certain sites, so lets go back to a simpler way
        // by just requesting the image and converting it to binary data and base64 encoding it
        try {
            // Note: only works if the image is from the same domain as the page,
            // or has the crossOrigin="anonymous" attribute and the server supports CORS.
            // ref. https://stackoverflow.com/questions/934012/get-image-data-url-in-javascript
            // !!! setting the crossOrigin attributes triggers an image reload, so we have to use onload !!!
            data = (await browser.tabs.executeScript(tab.id, {
                frameId: info.frameId,
                code: `(async function () {
                let img = browser.menus.getTargetElement(${info.targetElementId});
                if(img.crossOrigin === 'anonymous') {
                    let canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    let ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    const dataurl = canvas.toDataURL("image/png");
                    return dataurl;
                }
                let p = new Promise(function(resolve,reject){
                    img.onerror = reject;
                    img.onload = function() {
                        let canvas = document.createElement("canvas");
                        canvas.width = img.naturalWidth || img.width;
                        canvas.height = img.naturalHeight || img.height;
                        let ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0);
                        const dataurl = canvas.toDataURL("image/png");
                        resolve(dataurl);
                    }
                });
                img.setAttribute('crossOrigin', 'anonymous');
                return p;
                }());`
            }))[0];
        }catch(e) {
            data = `${extname}: ${e}`;
            console.error(e);
        }
        */
  },
});
