import type { SVGProps } from 'react';

/**
 * Original line icons for Paperplane. 24×24, 1.6 stroke, round caps/joins.
 * Intentionally simple and consistent — not derived from any icon set.
 */
function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

export function IconCompress(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M9 4v4H5M15 4v4h4M9 20v-4H5M15 20v-4h4" />
      <path d="M12 9v6" />
      <path d="m9.5 12 2.5 3 2.5-3" />
    </svg>
  );
}

export function IconMerge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="9" height="12" rx="1.5" />
      <rect x="12" y="8" width="9" height="12" rx="1.5" />
    </svg>
  );
}

export function IconSplit(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M12 4v16" strokeDasharray="2 2.5" />
    </svg>
  );
}

export function IconOrganize(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="7" height="9" rx="1.5" />
      <rect x="14" y="8" width="7" height="9" rx="1.5" />
      <path d="M10 8h4m0 0-2-2m2 2-2 2" />
    </svg>
  );
}

export function IconPdfToImage(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3" width="10" height="14" rx="1.5" />
      <rect x="10" y="8" width="10" height="13" rx="1.5" />
      <circle cx="13.5" cy="12" r="1.2" />
      <path d="m11 19 3-3 3 2.5" />
    </svg>
  );
}

export function IconImageToPdf(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="12" height="10" rx="1.5" />
      <circle cx="7" cy="9" r="1.1" />
      <path d="m5 14 3-3 3 2.5" />
      <path d="M14 9h6v11a1 1 0 0 1-1 1h-8" />
    </svg>
  );
}

export function IconImage(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-5 4 3.5L16 12l4 4" />
    </svg>
  );
}

export function IconNumber(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M13 9.5 15 8v8M9 16h2" />
      <path d="M8.5 9.8A1.8 1.8 0 0 1 12 10c0 1.3-1.8 2-3.5 4H12" />
    </svg>
  );
}

export function IconWatermark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M8 15.5 16 8" opacity="0.5" />
      <path d="M8 11.5 12.5 7M11.5 17 16 12.5" opacity="0.5" />
    </svg>
  );
}

export function IconHome(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function IconGrid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

export function IconBack(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v3" />
    </svg>
  );
}

export function IconRotate(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

export function IconGrayscale(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBlankPages(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="12" height="16" rx="1.5" opacity="0.4" />
      <rect x="8" y="6" width="13" height="16" rx="1.5" />
      <path d="M11 11h7M11 14h5M11 17h6" />
    </svg>
  );
}

export function IconExtractImages(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="13" height="16" rx="1.5" />
      <path d="M6.5 8h6M6.5 11h4" />
      <rect x="11" y="12" width="10" height="9" rx="1.5" />
      <circle cx="14" cy="15.3" r="1" />
      <path d="m12 19 2.3-2.3 1.7 1.7 2-2.4 2 2.4" />
    </svg>
  );
}

/** GitHub mark — a filled glyph, so it doesn't use the line-icon base(). */
export function IconGitHub(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10z" />
    </svg>
  );
}
