// Turns an uploaded photo into a smaller JPEG "data URL" (a text version of
// the picture) so it fits in browser storage. Phone photos are often 3-8 MB;
// after this they are usually under 150 KB.
//
// When the database is ready, upload the original file to the server instead
// and save the returned image link in `item.image`.

export default function resizeImage(file, maxSize = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file (JPG, PNG or WebP)."));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as a picture. Try another one."));
    };

    img.src = url;
  });
}
