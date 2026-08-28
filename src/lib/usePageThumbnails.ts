import { useEffect, useRef, useState } from 'react';
import { openDoc, renderPage } from './pdfDoc';
import { errorMessage } from './errors';

export interface PageThumb {
  index: number;
  url: string;
}

interface State {
  pages: PageThumb[];
  pageCount: number;
  loading: boolean;
  error: string | null;
}

const EMPTY: State = { pages: [], pageCount: 0, loading: false, error: null };

/**
 * Render every page of `file` to a thumbnail via the MuPDF worker, streaming
 * them in as they finish. Object URLs are revoked when the file changes or the
 * component unmounts.
 */
export function usePageThumbnails(file: File | null): State {
  const [state, setState] = useState<State>(EMPTY);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    urls.current.forEach(URL.revokeObjectURL);
    urls.current = [];

    if (!file) {
      setState(EMPTY);
      return;
    }

    let cancelled = false;
    setState({ ...EMPTY, loading: true });

    (async () => {
      try {
        const doc = await openDoc(file);
        if (cancelled) {
          doc.close();
          return;
        }
        setState({ pages: [], pageCount: doc.pageCount, loading: true, error: null });

        const pages: PageThumb[] = [];
        for (let i = 0; i < doc.pageCount; i++) {
          if (cancelled) break;
          const { blob } = await renderPage(doc.docId, i, {
            maxWidth: 200,
            format: 'jpeg',
            quality: 70,
          });
          const url = URL.createObjectURL(blob);
          urls.current.push(url);
          pages.push({ index: i, url });
          if (!cancelled) setState((s) => ({ ...s, pages: [...pages] }));
        }
        doc.close();
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      } catch (err) {
        if (!cancelled) setState({ ...EMPTY, error: errorMessage(err) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  return state;
}
