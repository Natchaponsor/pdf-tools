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

/** What a tool can be handed off the bench. `none` = it makes its own input. */
export type Accepts = 'pdf' | 'image' | 'none';

export interface Tool {
  id: string;
  route: string;
  title: string;
  blurb: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accepts: Accepts;
  /** Newer and rougher than the rest; marked as such on the bench. */
  sandbox?: boolean;
  /** Rendered first within its group. */
  featured?: boolean;
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
    accepts: 'pdf',
    route: '/compress',
    title: 'Compress PDF',
    blurb: 'Shrink one or more PDFs for email or upload.',
    icon: IconCompress,
    featured: true,
  },
  {
    id: 'merge',
    accepts: 'pdf',
    route: '/merge',
    title: 'Merge PDFs',
    blurb: 'Combine several PDFs into one, in your order.',
    icon: IconMerge,
    featured: true,
  },
  {
    id: 'split',
    accepts: 'pdf',
    route: '/split',
    title: 'Split PDF',
    blurb: 'Pull out a page range or burst into single pages.',
    icon: IconSplit,
  },
  {
    id: 'organize',
    accepts: 'pdf',
    route: '/organize',
    title: 'Organize pages',
    blurb: 'Reorder, rotate, or delete pages, then export.',
    icon: IconOrganize,
    featured: true,
  },
  {
    id: 'rotate',
    accepts: 'pdf',
    route: '/rotate',
    title: 'Rotate PDF',
    blurb: 'Turn pages the right way up, one at a time or all at once.',
    icon: IconRotate,
  },
  {
    id: 'pdf-to-image',
    accepts: 'pdf',
    route: '/pdf-to-image',
    title: 'PDF to image',
    blurb: 'Save pages as PNG or JPG, one file or a zip.',
    icon: IconPdfToImage,
  },
  {
    id: 'images-to-pdf',
    accepts: 'image',
    route: '/images-to-pdf',
    title: 'Images to PDF',
    blurb: 'Turn JPG and PNG images into one PDF.',
    icon: IconImageToPdf,
  },
  {
    id: 'compress-image',
    accepts: 'image',
    route: '/compress-image',
    title: 'Compress image',
    blurb: 'Shrink JPG, PNG, or WebP files.',
    icon: IconImage,
  },
  {
    id: 'page-numbers',
    accepts: 'pdf',
    route: '/page-numbers',
    title: 'Add page numbers',
    blurb: 'Stamp page numbers with position and style options.',
    icon: IconNumber,
  },
  {
    id: 'watermark',
    accepts: 'pdf',
    route: '/watermark',
    title: 'Add watermark',
    blurb: 'Overlay text with adjustable opacity and position.',
    icon: IconWatermark,
  },
  {
    id: 'protect',
    accepts: 'pdf',
    route: '/protect',
    title: 'Protect PDF',
    blurb: 'Add a password, or remove one you know.',
    icon: IconLock,
  },
  {
    id: 'grayscale',
    accepts: 'pdf',
    route: '/grayscale',
    title: 'Grayscale PDF',
    blurb: 'Convert colour pages to black and white.',
    icon: IconGrayscale,
  },
  {
    id: 'remove-blank-pages',
    accepts: 'pdf',
    route: '/remove-blank-pages',
    title: 'Remove blank pages',
    blurb: 'Finds empty pages, then removes the ones you confirm.',
    icon: IconBlankPages,
  },
  {
    id: 'extract-images',
    accepts: 'pdf',
    route: '/extract-images',
    title: 'Extract images',
    blurb: 'Pull every embedded photo out of a PDF.',
    icon: IconExtractImages,
  },
];

const SANDBOX_TOOLS: Tool[] = [
  {
    id: 'scan',
    sandbox: true,
    accepts: 'none',
    route: '/scan',
    title: 'Scan documents',
    blurb: 'Photograph pages, auto-straighten them, and export one PDF.',
    icon: IconScan,
  },
  {
    id: 'translate',
    sandbox: true,
    accepts: 'pdf',
    route: '/translate',
    title: 'Translate PDF',
    blurb: 'Read the text off a scan, then hand it to your translator.',
    icon: IconTranslate,
  },
  {
    id: 'read-aloud',
    sandbox: true,
    accepts: 'pdf',
    route: '/read-aloud',
    title: 'Read PDF',
    blurb: 'Turn a scanned PDF into speech. Hands-free, works offline.',
    icon: IconReadAloud,
  },
];

const ALL_TOOLS: Tool[] = [...MAIN_TOOLS, ...SANDBOX_TOOLS];

function byId(ids: string[]): Tool[] {
  return ids.map((id) => {
    const tool = ALL_TOOLS.find((t) => t.id === id);
    if (!tool) throw new Error(`tools.ts: no tool with id "${id}"`);
    return tool;
  });
}

/**
 * Grouped by the verb you arrived wanting, not by how the tools were built.
 * Someone whose file is too big for an email is looking for SIZE; someone with
 * a photographed stack of pages is looking for ORDER. The old split (a flat
 * grid plus a "Sandbox" section) grouped by our confidence in the code, which
 * is our problem, not theirs. The rough ones now carry a mark on their own
 * row instead of being exiled to a section at the bottom.
 */
export const TOOL_SECTIONS: ToolSection[] = [
  {
    id: 'size',
    title: 'Size',
    description: 'Too big to send',
    tools: byId(['compress', 'compress-image', 'grayscale']),
  },
  {
    id: 'order',
    title: 'Order',
    description: 'Wrong pages, wrong way round',
    tools: byId(['merge', 'split', 'organize', 'rotate', 'remove-blank-pages']),
  },
  {
    id: 'convert',
    title: 'Convert',
    description: 'In or out of a PDF',
    tools: byId(['scan', 'pdf-to-image', 'images-to-pdf', 'extract-images']),
  },
  {
    id: 'mark',
    title: 'Mark & protect',
    description: 'Stamp it, or lock it',
    tools: byId(['page-numbers', 'watermark', 'protect']),
  },
  {
    id: 'read',
    title: 'Read',
    description: 'Get the words off a scan',
    tools: byId(['translate', 'read-aloud']),
  },
];

export const TOOLS: Tool[] = ALL_TOOLS;

export const toolByRoute = (route: string): Tool | undefined =>
  TOOLS.find((t) => route === t.route || route.startsWith(t.route + '/'));

/**
 * A few natural next steps per tool, for the "Continue with…" row on a
 * result card. Deliberately short (3 max) and one-directional. This is a
 * shortcut into a related tool, not a workflow graph to maintain in full.
 * Left off entirely where the next likely step isn't a PDF tool at all, or
 * where the result usually stands on its own (e.g. straight after Protect).
 */
const CHAIN_SUGGESTIONS: Record<string, string[]> = {
  merge: ['page-numbers', 'compress', 'protect'],
  split: ['merge', 'page-numbers', 'compress'],
  organize: ['page-numbers', 'compress', 'protect'],
  rotate: ['organize', 'page-numbers', 'compress'],
  'images-to-pdf': ['page-numbers', 'watermark', 'compress'],
  'page-numbers': ['watermark', 'compress', 'protect'],
  watermark: ['page-numbers', 'compress', 'protect'],
  grayscale: ['compress'],
  'remove-blank-pages': ['organize', 'page-numbers', 'compress'],
  unlock: ['organize', 'compress'],
};

export function getChainTargets(fromId: string): Tool[] {
  const ids = CHAIN_SUGGESTIONS[fromId] ?? [];
  return ids.map((id) => TOOLS.find((t) => t.id === id)).filter((t): t is Tool => !!t);
}
