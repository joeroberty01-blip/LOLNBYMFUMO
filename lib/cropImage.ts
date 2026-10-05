/** Browser-only canvas crop — takes the pixel area react-easy-crop reports (onCropComplete's
 * second argument) and draws just that region onto a same-size canvas, exported as a Blob ready
 * to upload. No server involvement; the crop happens entirely client-side before the file is
 * ever sent to uploadPartPhoto. */
export type CropPixelArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = src;
  });
}

export async function getCroppedImageBlob(
  imageSrc: string,
  cropPixels: CropPixelArea,
  mimeType: string
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas haipatikani kwenye browser hii");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Imeshindikana ku-crop picha"))),
      mimeType,
      0.92
    );
  });
}
