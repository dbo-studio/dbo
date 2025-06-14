import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import locales from '@/locales';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { renderWithProviders } from '@/test/test-utils.tsx';
import type { ConnectionType } from '@/types';
import { screen } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';
import ConnectionBox from './ConnectionBox.tsx';

describe('ConnectionBox.tsx', () => {
  const spy = vi.spyOn(conn, 'useConnectionStore');
  const connection = connectionDetailModel;

  test('should show error when state loading ', () => {
    spy.mockReturnValue({
      currentConnection: (): null => null,
      loading: 'loading'
    });

    renderWithProviders(<ConnectionBox />);
    expect(screen.getByText(locales.connecting)).not.toBeNull();
  });

  test('should show error when loading failed', () => {
    spy.mockReturnValue({
      currentConnection: (): null => null,
      loading: 'error'
    });

    renderWithProviders(<ConnectionBox />);
    expect(screen.getByText(locales.connection_error)).not.toBeNull();
  });

  test('should render the the connection box', () => {
    spy.mockReturnValue({
      currentConnection: (): null => null,
      loading: 'finished'
    });

    renderWithProviders(<ConnectionBox />);
    expect(screen.getByText(locales.no_active_connection)).not.toBeNull();
  });

  test('should with connection', () => {
    spy.mockReturnValue({
      currentConnection: (): ConnectionType => connection,
      loading: 'finished'
    });

    renderWithProviders(<ConnectionBox />);

    expect(screen.getByRole('heading', { level: 6 })).not.toBeNull();
  });
});
