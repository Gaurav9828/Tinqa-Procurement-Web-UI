import { darkToLight } from '../charts/palette';
import type { ChartImage } from './report.types';

/**
 * A live chart as a PNG on white: hover layers dropped, dark-mode colors swapped for their light steps,
 * drawn at 2x so it stays sharp in print.
 */
export const chartToImage = async (svg: SVGSVGElement): Promise<ChartImage> => {
  const width = Number(svg.getAttribute('width')) || svg.clientWidth || 600;
  const height = Number(svg.getAttribute('height')) || svg.clientHeight || 240;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export-ignore]').forEach((node) => node.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', '#ffffff');
  clone.insertBefore(background, clone.firstChild);
  clone.querySelectorAll('[opacity]').forEach((node) => node.setAttribute('opacity', '1'));

  const markup = darkToLight(new XMLSerializer().serializeToString(clone));
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Chart could not be drawn'));
    image.src = url;
  });
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.scale(scale, scale);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/png'), width, height };
};

export const chartImages = async (charts: (SVGSVGElement | null | undefined)[] = []): Promise<ChartImage[]> => {
  const images: ChartImage[] = [];
  for (const chart of charts) {
    if (chart) images.push(await chartToImage(chart));
  }
  return images;
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const binary = atob(dataUrl.split(',')[1] ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
