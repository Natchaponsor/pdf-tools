import type { ComponentType, SVGProps } from 'react';
import {
  IconCompress,
  IconMerge,
  IconSplit,
  IconOrganize,
  IconRotate,
  IconPdfToImage,
  IconImageToPdf,
  IconImage,
  IconNumber,
  IconWatermark,
  IconLock,
  IconGrayscale,
  IconBlankPages,
  IconExtractImages,
  IconTranslate,
  IconReadAloud,
  IconScan,
} from '../components/icons';

export interface Tool {
  id: string;
  route: string;
  title: string;
  blurb: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface ToolSection {
  id: string;
  /** Heading shown above the section, or null for the unlabeled main grid. */
  title: string | null;
  description?: string;
  tools: Tool[];
}

const MAIN_TOOLS: Tool[] = [
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
    id: 'rotate',
    route: '/rotate',
    title: 'Rotate PDF',
    blurb: 'Turn pages the right way up, one at a time or all at once.',
    icon: IconRotate,
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
  {
    id: 'protect',
    route: '/protect',
    title: 'Protect PDF',
    blurb: 'Add a password, or remove one you know.',
    icon: IconLock,
  },
  {
    id: 'grayscale',
    route: '/grayscale',
    title: 'Grayscale PDF',
    blurb: 'Convert colour pages to black and white.',
    icon: IconGrayscale,
  },
  {
    id: 'remove-blank-pages',
    route: '/remove-blank-pages',
    title: 'Remove blank pages',
    blurb: 'Finds empty pages, then removes the ones you confirm.',
    icon: IconBlankPages,
  },
  {
    id: 'extract-images',
    route: '/extract-images',
    title: 'Extract images',
    blurb: 'Pull every embedded photo out of a PDF.',
    icon: IconExtractImages,
  },
];

const SANDBOX_TOOLS: Tool[] = [
  {
    id: 'scan',
    route: '/scan',
    title: 'Scan documents',
    blurb: 'Photograph pages, auto-straighten them, and export one PDF.',
    icon: IconScan,
  },
  {
    id: 'translate',
    route: '/translate',
    title: 'Translate PDF',
    blurb: 'Read the text off a scan, then hand it to your translator.',
    icon: IconTranslate,
  },
  {
    id: 'read-aloud',
    route: '/read-aloud',
    title: 'Read PDF',
    blurb: 'Turn a scanned PDF into speech. Hands-free, works offline.',
    icon: IconReadAloud,
  },
];

export const TOOL_SECTIONS: ToolSection[] = [
  { id: 'main', title: null, tools: MAIN_TOOLS },
  {
    id: 'sandbox',
    title: 'Sandbox',
    description: 'Newer, experimental tools. Both run text recognition on your device first.',
    tools: SANDBOX_TOOLS,
  },
];

export const TOOLS: Tool[] = TOOL_SECTIONS.flatMap((s) => s.tools);

export const toolByRoute = (route: string): Tool | undefined =>
  TOOLS.find((t) => route === t.route || route.startsWith(t.route + '/'));
