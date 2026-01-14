// utils/cropImage.ts
import { Area } from 'react-easy-crop';

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  zoom: number,
  aspect: number,
  brightness: number = 100
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  // Set canvas size to final crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Move to center for rotation, then draw the correct crop area
  ctx.save();
  ctx.filter = `brightness(${brightness}%)`;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve('');
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/jpeg');
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });
}
