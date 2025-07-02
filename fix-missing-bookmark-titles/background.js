/* global browser */

browser.browserAction.onClicked.addListener(async () => {
  (await browser.bookmarks.search({}))
    .filter(
      (b) =>
        typeof b.url === "string" &&
        b.url.startsWith("http") &&
        typeof b.title === "string" &&
        b.title === ""
    )
    .forEach(async (b) => {
      try {
        const response = await fetch(b.url);
        const responseText = await response.text();

        const parser = new DOMParser();
        const parsedResponse = parser.parseFromString(
          responseText,
          "text/html"
        );

        // update bookmark title
        if (
          parsedResponse &&
          typeof parsedResponse.title === "string" &&
          parsedResponse.title !== ""
        ) {
          await browser.bookmarks.update(b.id, { title: parsedResponse.title });
        }
      } catch (e) {
        console.error(e);
      }
    });
});
