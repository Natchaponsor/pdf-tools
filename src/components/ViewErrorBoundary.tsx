import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Bump this (e.g. the current route) to clear the error on navigation. */
  resetKey: string;
}

interface State {
  failed: boolean;
}

/**
 * Catches failures from the lazy-loaded tool views. The common case is an
 * offline visit to a tool whose JS chunk was never cached — without this the
 * whole app would unmount to a blank screen.
 */
export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tool view failed to load', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-lg font-semibold text-ink-900 dark:text-white">
          This tool isn&rsquo;t available offline yet
        </h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-white/60">
          Each tool loads the first time you open it online, then works offline
          afterwards. Reconnect and open this one once to make it available.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Retry
        </button>
      </div>
    );
  }
}
