import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import * as conn from '@/store/connectionStore/connection.store.ts';
import * as ta from '@/store/tabStore/tab.store.ts';
import * as tree from '@/store/treeStore/tree.store.ts';
import * as settings from '@/store/settingStore/setting.store.ts';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ConnectionInfo from './ConnectionInfo';
import type { ConnectionType } from '@/types';

const mockInvalidateQueries = vi.fn();

describe('ConnectionInfo.tsx', () => {
  const spyConnection = vi.spyOn(conn, 'useConnectionStore');
  const spyTab = vi.spyOn(ta, 'useTabStore');
  const spyTree = vi.spyOn(tree, 'useTreeStore');
  const spySetting = vi.spyOn(settings, 'useSettingStore');
  const mockUpdateLoading = vi.fn();
  const mockReloadTree = vi.fn();
  const mockToggleAddConnection = vi.fn();
  const mockAddEditorTab = vi.fn();
  const mockUpdateSelectedTab = vi.fn();

  vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual('@tanstack/react-query');
    return {
      ...actual,
      // biome-ignore lint/nursery/useExplicitType: <explanation>
      useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries
      })
    };
  });

  vi.mock('@/store/connectionStore/connection.store.ts', () => ({
    useConnectionStore: vi.fn()
  }));

  vi.mock('@/store/tabStore/tab.store.ts', () => ({
    useTabStore: vi.fn()
  }));

  vi.mock('@/store/treeStore/tree.store.ts', () => ({
    useTreeStore: vi.fn()
  }));

  vi.mock('@/store/settingStore/setting.store.ts', () => ({
    useSettingStore: vi.fn()
  }));

  beforeEach(() => {
    spyConnection.mockReturnValue({
      currentConnection: (): ConnectionType => connectionDetailModel,
      updateLoading: mockUpdateLoading,
      updateCurrentConnection: vi.fn(),
      loading: 'finished'
    });

    spyTree.mockReturnValue({
      reloadTree: mockReloadTree
    });

    spyTab.mockReturnValue({
      addEditorTab: mockAddEditorTab,
      updateSelectedTab: mockUpdateSelectedTab
    });

    spySetting.mockReturnValue({
      toggleShowAddConnection: mockToggleAddConnection,
      showSettings: false
    });

    renderWithProviders(<ConnectionInfo />);
  });

  test('should render the connection info', () => {
    expect(screen.getByLabelText('sql')).toBeInTheDocument();
    expect(screen.getByLabelText('connections')).toBeInTheDocument();
  });

  test('should open create connection modal after click connection icon', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'connections' }));
    expect(mockToggleAddConnection).toHaveBeenCalledWith(true);
  });

  test('should open new editor tab after click editor icon', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'sql' }));
    expect(mockAddEditorTab).toHaveBeenCalled();
    expect(mockUpdateSelectedTab).toHaveBeenCalled();
  });

  test('should call handleRefresh on refresh button click', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'refresh' }));
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['connections'] });
    expect(mockReloadTree).toHaveBeenCalled();
  });

  test('should disable sql button when there is no current connection', () => {
    spyConnection.mockReturnValue({
      currentConnection: (): ConnectionType | undefined => undefined,
      updateLoading: mockUpdateLoading,
      updateCurrentConnection: vi.fn(),
      loading: 'finished'
    });

    renderWithProviders(<ConnectionInfo />);
    expect(screen.getAllByRole('button', { name: 'sql' })[1]).toBeDisabled();
  });
});
