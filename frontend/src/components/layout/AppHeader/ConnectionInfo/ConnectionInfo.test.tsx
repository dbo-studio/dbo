import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import locales from '@/locales';
import * as conn from '@/store/connectionStore/connection.store.ts';
import * as ta from '@/store/tabStore/tab.store.ts';
import * as tree from '@/store/treeStore/tree.store.ts';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ConnectionInfo from './ConnectionInfo';

vi.mock('@/hooks/useNavigate.hook', () => ({
  default: () => vi.fn()
}));

vi.mock('@/hooks/useCurrentConnection.tsx', () => ({
  useCurrentConnection: () => connectionDetailModel
}));

describe('ConnectionInfo.tsx', () => {
  const spyConnection = vi.spyOn(conn, 'useConnectionStore');
  const spyTab = vi.spyOn(ta, 'useTabStore');
  const spyTree = vi.spyOn(tree, 'useTreeStore');
  const mockUpdateLoading = vi.fn();
  const mockReloadTree = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.mock('@/store/connectionStore/connection.store.ts', () => ({
      useConnectionStore: vi.fn()
    }));

    vi.mock('@/store/tabStore/tab.store.ts', () => ({
      useTabStore: vi.fn()
    }));

    vi.mock('@/store/treeStore/tree.store.ts', () => ({
      useTreeStore: vi.fn()
    }));

    spyConnection.mockReturnValue({
      currentConnection: connectionDetailModel,
      updateLoading: mockUpdateLoading,
      updateCurrentConnection: vi.fn(),
      loading: 'finished'
    });

    spyTab.mockReturnValue({
      addTab: () => {
        return { id: 'test' };
      }
    });

    spyTree.mockReturnValue({
      reloadTree: mockReloadTree
    });

    renderWithProviders(<ConnectionInfo />);
  });

  test('should render the connection info', () => {
    expect(screen.getByLabelText('sql')).not.toBeNull();
    expect(screen.getByLabelText('connections')).not.toBeNull();
  });

  test('should open databases modal after click db icon', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'databases' }));

    await waitFor(() => {
      expect(screen.getByText(locales.select_database)).toBeInTheDocument();
    });
  });

  test('should open create connection modal after click connection icon', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'connections' }));

    await waitFor(() => {
      expect(screen.getByText(locales.new_connection)).toBeInTheDocument();
    });
  });

  test('should open new editor tab after click editor icon', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'sql' }));

    expect(mockNavigate).toHaveBeenCalledWith({
      route: 'query',
      tabId: 'test'
    });
  });

  test('should refresh connection and reload tree after click on refresh button', async () => {
    const queryClient = require('@tanstack/react-query').useQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await userEvent.click(screen.getByLabelText('refresh'));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['connections', connectionDetailModel.id]
    });
    expect(mockReloadTree).toHaveBeenCalled();
  });

  test('should disable sql button when no connection is active', () => {
    spyConnection.mockReturnValue({
      currentConnection: null,
      updateLoading: mockUpdateLoading,
      updateCurrentConnection: vi.fn(),
      loading: 'finished'
    });

    renderWithProviders(<ConnectionInfo />);

    expect(screen.getByRole('button', { name: 'sql' })).toBeDisabled();
  });
});
