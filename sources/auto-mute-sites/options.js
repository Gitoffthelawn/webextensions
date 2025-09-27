/* global browser */

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("sites").value = Array.from(
    await getFromStorage("object", "mutedOrigins", new Set()),
  ).join("\n");

  document.getElementById("save").addEventListener("click", async () => {
    if (
      !confirm(
        "Are you sure?\nThe current data will be overwritten when you click on ok.",
      )
    ) {
      return;
    }

    setToStorage(
      "mutedOrigins",
      new Set(
        document
          .getElementById("sites")
          .value.split(/\s+/)
          .map((l) => l.trim())
          .filter((l) => l !== "" && l.startsWith("http")),
      ),
    );

    document.getElementById("sites").value = Array.from(
      await getFromStorage("object", "mutedOrigins", new Set()),
    ).join("\n");
  });
});
