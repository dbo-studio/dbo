import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import locales from '@/locales';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import * as ta from '@/store/tabStore/tab.store.ts';
import { screen } from '@testing-library/dom';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ConnectionInfo from './ConnectionInfo';

describe('ConnectionInfo.tsx', () => {
  const spyConnection = vi.spyOn(conn, 'useConnectionStore');
  const spyTab = vi.spyOn(ta, 'useTabStore');

  const mockUpdateShowSelectDatabase = vi.fn();
  const updateShowAddConnection = vi.fn();

  beforeEach(() => {
    vi.mock('@/store/connectionStore/connection.store.ts', () => ({
      useConnectionStore: vi.fn()
    }));

    vi.mock('@/store/tabStore/tab.store.ts', () => ({
      useTabStore: vi.fn()
    }));

    spyConnection.mockReturnValue({
      currentConnection: connectionDetailModel,
      updateShowSelectDatabase: mockUpdateShowSelectDatabase,
      showSelectDatabase: false,
      updateShowAddConnection: updateShowAddConnection,
      showAddConnection: false
    });

    spyTab.mockReturnValue({
      addTab: () => {
        return { id: 'test' };
      }
    });

    render(
      <BrowserRouter>
        <ConnectionInfo />
      </BrowserRouter>
    );
  });

  test('should render the the connection info', () => {
    expect(screen.getByLabelText('sql')).not.toBeNull();
    expect(screen.getByLabelText('databases')).not.toBeNull();
    expect(screen.getByLabelText('connections')).not.toBeNull();
  });

  test('should open databases modal after click db icon', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'databases' }));

    expect(mockUpdateShowSelectDatabase).toHaveBeenCalledWith(true);
    act(() => {
      spyConnection.mockReturnValue({
        ...useConnectionStore,
        showSelectDatabase: true
      });
    });

    await waitFor(() => expect(screen.findAllByText(locales.select_database)).not.toBeNull());
  });

  test('should open create connection modal after click connection icon', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'connections' }));
    expect(updateShowAddConnection).toHaveBeenCalledWith(true);
    spyConnection.mockReturnValue({
      ...useConnectionStore,
      showAddConnection: true
    });

    await waitFor(() => expect(screen.findAllByText(locales.new_connection)).not.toBeNull());
  });

  test('should open new editor tab after click editor icon', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'sql' }));
  });
});
