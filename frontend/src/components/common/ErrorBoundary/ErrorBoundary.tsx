import { Component, type ErrorInfo, type ReactNode } from 'react';
import CrashScreen from './CrashScreen';

const TABLE_DATA_DB_PREFIX = 'table-data-db';

const clearPersistedFrontend = (): void => {
  try {
    localStorage.clear();
  } catch {
    // ignore quota / private mode
  }

  try {
    indexedDB.deleteDatabase(TABLE_DATA_DB_PREFIX);
  } catch {
    // ignore; reload still recovers localStorage persist
  }

  try {
    void indexedDB.databases?.()?.then((dbs) => {
      for (const db of dbs) {
        if (db.name?.startsWith(`${TABLE_DATA_DB_PREFIX}:`)) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });
  } catch {
    // ignore
  }
};

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
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
