// Applied as early as possible (before the stylesheets paint) so the page
// never flashes the wrong theme. Defaults to following the system/browser
// color scheme until the user picks one explicitly via the toolbar button
// (see options.js). Kept in its own file, rather than inline in
// options.html, because the extension's default CSP blocks inline scripts.
(function () {
  try {
    var pref = localStorage.getItem("ac-theme-pref") || "auto";
    var dark =
      pref === "dark" ||
      (pref === "auto" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
  } catch (e) {}
})();
