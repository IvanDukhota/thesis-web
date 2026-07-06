import type { MessageAttachment } from "../../shared/api/chat";

type ImageAttachment = MessageAttachment & {
  width: number;
  height: number;
};


function getOrientation(image: ImageAttachment): 'horizontal' | 'vertical' | 'square' {
  if (!image.width || !image.height) return 'square';

  const ratio = image.width / image.height;

  if (ratio > 1.2) return 'horizontal';
  if (ratio < 0.8) return 'vertical';
  return 'square';
}


export function layoutImages(images: ImageAttachment[]): ImageAttachment[][] {
  if (images.length === 0) return [];
  if (images.length === 1) return [[images[0]]];

  const orientations = images.map(getOrientation);

  if (images.length === 2) {
    const [o1, o2] = orientations;

    if (o1 === 'horizontal' && o2 === 'horizontal') {
      return [[images[0]], [images[1]]];
    }

    if (o1 === 'vertical' && o2 === 'vertical') {
      return [[images[0], images[1]]];
    }

    return [[images[0], images[1]]];
  }

  if (images.length === 3) {
    const horizontalCount = orientations.filter(o => o === 'horizontal').length;
    const verticalCount = orientations.filter(o => o === 'vertical').length;

    if (horizontalCount === 3) {
      return [[images[0]], [images[1]], [images[2]]];
    }

    if (verticalCount === 3) {
      return [[images[0], images[1], images[2]]];
    }

    return [[images[0]], [images[1], images[2]]];
  }

  if (images.length === 4) {
    const horizontalCount = orientations.filter(o => o === 'horizontal').length;
    const verticalCount = orientations.filter(o => o === 'vertical').length;

    if (horizontalCount === 4) {
      return [[images[0]], [images[1]], [images[2]], [images[3]]];
    }

    if (verticalCount === 4) {
      return [[images[0], images[1]], [images[2], images[3]]];
    }

    return [[images[0], images[1]], [images[2], images[3]]];
  }


  if (images.length >= 5) {
    const rows: ImageAttachment[][] = [];
    let currentRow: ImageAttachment[] = [];

    for (let i = 0; i < images.length; i++) {
      const orientation = orientations[i];

      if (orientation === 'horizontal') {
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        rows.push([images[i]]);
      }
      else {
        currentRow.push(images[i]);

        if (currentRow.length === 3) {
          rows.push(currentRow);
          currentRow = [];
        }
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  return [images];
}
