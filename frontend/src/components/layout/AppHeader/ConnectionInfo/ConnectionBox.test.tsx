import { transformConnectionDetail } from '@/api/connection/transformers.ts';
import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import locales from '@/locales';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ConnectionBox from './ConnectionBox';

describe('ConnectionBox.tsx', () => {
  const spy = vi.spyOn(conn, 'useConnectionStore');

  beforeEach(() => {
    spy.mockReturnValue({
      currentConnection: null
    });
  });

  test('should render the the connection box', () => {
    render(
      <MemoryRouter>
        <ConnectionBox />
      </MemoryRouter>
    );
    expect(screen.getByText(locales.no_active_connection)).not.toBeNull();
  });

  test('should with connection', () => {
    const connection = transformConnectionDetail(connectionDetailModel);
    spy.mockReturnValue({
      currentConnection: connection
    });

    render(
      <MemoryRouter>
        <ConnectionBox />
      </MemoryRouter>
    );

    const txt = 'PostgreSQL 16.1 public: sample_db SQL Query';
    expect(screen.getByText(txt)).not.toBeNull();
  });
});
