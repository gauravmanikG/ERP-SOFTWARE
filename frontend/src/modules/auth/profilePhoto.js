// Turns a picked image file into a small square JPEG data URL (center-cropped), so a
// phone photo of several MB is stored as ~20-40 KB. The backend accepts only image data URLs.
export const PHOTO_SIZE = 256;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export function fileToProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file selected."));
    if (!/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.type)) return reject(new Error("Choose a PNG, JPEG or WebP image."));
    if (file.size > MAX_INPUT_BYTES) return reject(new Error("That image is too large (max 15 MB)."));

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = PHOTO_SIZE;
      canvas.height = PHOTO_SIZE;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background in JPEG
      ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
    img.src = url;
  });
}
