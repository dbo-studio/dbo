import { Component, type ErrorInfo, type ReactNode } from 'react';
import CrashScreen from './CrashScreen';

/** Matches `indexedDB.service` DB_NAME. Do not import that module here — it opens IDB on load. */
const TABLE_DATA_DB_NAME = 'table-data-db';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

const clearPersistedFrontend = (): void => {
  try {
    localStorage.clear();
  } catch {
    // ignore quota / private mode
  }

  try {
    indexedDB.deleteDatabase(TABLE_DATA_DB_NAME);
  } catch {
    // ignore; reload still recovers localStorage persist
  }
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App crash', error, info.componentStack);
  }

  private handleReload = (): void => {
    clearPersistedFrontend();
    window.location.replace(`${window.location.origin}/`);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <CrashScreen onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}

/** DEV/e2e only: `/?crash=1` throws so the crash screen can be exercised. */
export function DevCrashProbe(): null {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('crash') === '1') {
    throw new Error('Intentional crash');
  }

  return null;
}
