import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';

const IMAGE_PADDING = 48;

const downloadDataUrl = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
};

export type ExportDiagramFormat = 'png' | 'svg';

export async function exportDiagramViewport(args: {
  nodes: Node[];
  format: ExportDiagramFormat;
  filename: string;
  backgroundColor: string;
}): Promise<void> {
  const viewport = document.querySelector('.react-flow__viewport');
  if (!(viewport instanceof HTMLElement)) {
    return;
  }

  const bounds = getNodesBounds(args.nodes);
  const width = bounds.width + IMAGE_PADDING * 2;
  const height = bounds.height + IMAGE_PADDING * 2;
  const viewportTransform = getViewportForBounds(bounds, width, height, 0.5, 2, IMAGE_PADDING);

  const options = {
    width,
    height,
    backgroundColor: args.backgroundColor,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.zoom})`
    }
  };

  const dataUrl = args.format === 'png' ? await toPng(viewport, options) : await toSvg(viewport, options);
  downloadDataUrl(dataUrl, `${args.filename}.${args.format}`);
}
