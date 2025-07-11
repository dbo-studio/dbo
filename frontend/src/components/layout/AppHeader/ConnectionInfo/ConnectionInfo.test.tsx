import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ConnectionInfo from './ConnectionInfo';

const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: (): { invalidateQueries: typeof mockInvalidateQueries } => ({
      invalidateQueries: mockInvalidateQueries
    })
  };
});

describe('ConnectionInfo.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the connection info', () => {
    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(connectionDetailModel),
      updateLoading: createSpy(),
      updateCurrentConnection: createSpy(),
      loading: 'finished'
    });

    setupStoreMocks.treeStore({
      reloadTree: createSpy()
    });

    setupStoreMocks.tabStore({
      addEditorTab: createSpy(),
      updateSelectedTab: createSpy()
    });

    setupStoreMocks.settingStore({
      toggleShowAddConnection: createSpy(),
      showSettings: false
    });

    renderWithProviders(<ConnectionInfo />);

    expect(screen.getByLabelText('sql')).toBeInTheDocument();
    expect(screen.getByLabelText('connections')).toBeInTheDocument();
  });

  test('should open create connection modal after click connection icon', async () => {
    const mockToggleAddConnection = createSpy();

    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(connectionDetailModel),
      updateLoading: createSpy(),
      updateCurrentConnection: createSpy(),
      loading: 'finished'
    });

    setupStoreMocks.treeStore({
      reloadTree: createSpy()
    });

    setupStoreMocks.tabStore({
      addEditorTab: createSpy(),
      updateSelectedTab: createSpy()
    });

    setupStoreMocks.settingStore({
      toggleShowAddConnection: mockToggleAddConnection,
      showSettings: false
    });

    renderWithProviders(<ConnectionInfo />);

    await userEvent.click(screen.getByRole('button', { name: 'connections' }));
    expect(mockToggleAddConnection).toHaveBeenCalledWith(true);
  });

  test('should open new editor tab after click editor icon', async () => {
    const mockAddEditorTab = createSpy();
    const mockUpdateSelectedTab = createSpy();

    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(connectionDetailModel),
      updateLoading: createSpy(),
      updateCurrentConnection: createSpy(),
      loading: 'finished'
    });

    setupStoreMocks.treeStore({
      reloadTree: createSpy()
    });

    setupStoreMocks.tabStore({
      addEditorTab: mockAddEditorTab,
      updateSelectedTab: mockUpdateSelectedTab
    });

    setupStoreMocks.settingStore({
      toggleShowAddConnection: createSpy(),
      showSettings: false
    });

    renderWithProviders(<ConnectionInfo />);

    await userEvent.click(screen.getByRole('button', { name: 'sql' }));
    expect(mockAddEditorTab).toHaveBeenCalled();
    expect(mockUpdateSelectedTab).toHaveBeenCalled();
  });

  test('should call handleRefresh on refresh button click', async () => {
    const mockReloadTree = createSpy();

    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(connectionDetailModel),
      updateLoading: createSpy(),
      updateCurrentConnection: createSpy(),
      loading: 'finished'
    });

    setupStoreMocks.treeStore({
      reloadTree: mockReloadTree
    });

    setupStoreMocks.tabStore({
      addEditorTab: createSpy(),
      updateSelectedTab: createSpy()
    });

    setupStoreMocks.settingStore({
      toggleShowAddConnection: createSpy(),
      showSettings: false
    });

    renderWithProviders(<ConnectionInfo />);

    await userEvent.click(screen.getByRole('button', { name: 'refresh' }));
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['connections'] });
    expect(mockReloadTree).toHaveBeenCalled();
  });

  test('should disable sql button when there is no current connection', () => {
    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(undefined),
      updateLoading: createSpy(),
      updateCurrentConnection: createSpy(),
      loading: 'finished'
    });

    setupStoreMocks.treeStore({
      reloadTree: createSpy()
    });

    setupStoreMocks.tabStore({
      addEditorTab: createSpy(),
      updateSelectedTab: createSpy()
    });

    setupStoreMocks.settingStore({
      toggleShowAddConnection: createSpy(),
      showSettings: false
    });

    renderWithProviders(<ConnectionInfo />);
    expect(screen.getAllByRole('button', { name: 'sql' })[1]).toBeDisabled();
  });
});
