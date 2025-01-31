import { transformConnectionDetail } from '@/api/connection/transformers.ts';
import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import locales from '@/locales';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ConnectionBox from './ConnectionBox.tsx';

describe('ConnectionBox.tsx', () => {
  const spy = vi.spyOn(conn, 'useConnectionStore');
  const connection = transformConnectionDetail(connectionDetailModel);

  test('should show error when state loading ', () => {
    spy.mockReturnValue({
      currentConnection: null,
      loading: 'loading'
    });

    render(
      <MemoryRouter>
        <ConnectionBox />
      </MemoryRouter>
    );
    expect(screen.getByText('Connecting')).not.toBeNull();
  });

  test('should show error when loading failed', () => {
    spy.mockReturnValue({
      currentConnection: null,
      loading: 'error'
    });

    render(
      <MemoryRouter>
        <ConnectionBox />
      </MemoryRouter>
    );
    expect(screen.getByText(locales.connection_error)).not.toBeNull();
  });

  test('should render the the connection box', () => {
    spy.mockReturnValue({
      currentConnection: null,
      loading: 'finished'
    });

    render(
      <MemoryRouter>
        <ConnectionBox />
      </MemoryRouter>
    );
    expect(screen.getByText(locales.no_active_connection)).not.toBeNull();
  });

  test('should with connection', () => {
    spy.mockReturnValue({
      currentConnection: connection,
      loading: 'finished'
    });

    render(
      <MemoryRouter>
        <ConnectionBox />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 6 })).not.toBeNull();
  });
});
