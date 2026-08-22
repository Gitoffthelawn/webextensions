async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

async function fileToImageData(file, targetWidth = 128, targetHeight = 128) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    return ctx.getImageData(0, 0, targetWidth, targetHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

document.getElementById("imageInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const status = document.getElementById("status");
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d");
  const fileNameDisplay = document.getElementById("fileNameDisplay"); // Add this

  if (!file) return;

  try {
    status.textContent = "Processing...";
    const imageData = await fileToImageData(file, 128, 128);

    // Preview on options page
    ctx.putImageData(imageData, 0, 0);
    canvas.style.display = "block";
    document.getElementById("previewLabel").style.display = "block";

    // Convert Uint8ClampedArray to Array for JSON serialization in storage
    const pixelArray = Array.from(imageData.data);
    await browser.storage.local.set({ savedIconData: pixelArray });

    // Update toolbar icon
    await browser.browserAction.setIcon({ imageData: imageData });

    status.textContent = "Success: Icon updated and saved!";
  } catch (error) {
    console.error(error);
    status.textContent = "Error processing image.";
  }
});
