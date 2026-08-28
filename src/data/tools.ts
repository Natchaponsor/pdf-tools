import type { ComponentType, SVGProps } from 'react';
import {
  IconCompress,
  IconMerge,
  IconSplit,
  IconOrganize,
  IconPdfToImage,
  IconImageToPdf,
  IconImage,
  IconNumber,
  IconWatermark,
} from '../components/icons';

export interface Tool {
  id: string;
  route: string;
  title: string;
  blurb: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const TOOLS: Tool[] = [
  {
    id: 'compress',
    route: '/compress',
    title: 'Compress PDF',
    blurb: 'Shrink one or more PDFs for email or upload.',
    icon: IconCompress,
  },
  {
    id: 'merge',
    route: '/merge',
    title: 'Merge PDFs',
    blurb: 'Combine several PDFs into one, in your order.',
    icon: IconMerge,
  },
  {
    id: 'split',
    route: '/split',
    title: 'Split PDF',
    blurb: 'Pull out a page range or burst into single pages.',
    icon: IconSplit,
  },
  {
    id: 'organize',
    route: '/organize',
    title: 'Organize pages',
    blurb: 'Reorder, rotate, or delete pages, then export.',
    icon: IconOrganize,
  },
  {
    id: 'pdf-to-image',
    route: '/pdf-to-image',
    title: 'PDF to image',
    blurb: 'Save pages as PNG or JPG, one file or a zip.',
    icon: IconPdfToImage,
  },
  {
    id: 'images-to-pdf',
    route: '/images-to-pdf',
    title: 'Images to PDF',
    blurb: 'Turn JPG and PNG images into one PDF.',
    icon: IconImageToPdf,
  },
  {
    id: 'compress-image',
    route: '/compress-image',
    title: 'Compress image',
    blurb: 'Shrink JPG, PNG, or WebP files.',
    icon: IconImage,
  },
  {
    id: 'page-numbers',
    route: '/page-numbers',
    title: 'Add page numbers',
    blurb: 'Stamp page numbers with position and style options.',
    icon: IconNumber,
  },
  {
    id: 'watermark',
    route: '/watermark',
    title: 'Add watermark',
    blurb: 'Overlay text with adjustable opacity and position.',
    icon: IconWatermark,
  },
];

export const toolByRoute = (route: string): Tool | undefined =>
  TOOLS.find((t) => route === t.route || route.startsWith(t.route + '/'));
