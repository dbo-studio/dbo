import { connectionDetailModel, connectionListItemModel } from '@/core/mocks/handlers/connections';
import { renderBrowser } from '@/test/test-utils';
import { describe, expect, test, vi } from 'vitest';
import Histories from './Histories';

const mockConnection = (): void => {
  vi.mock('@/store/connectionStore/connection.store.ts', () => ({
    // biome-ignore lint/nursery/useExplicitType: <explanation>
    useConnectionStore: () => ({
      // biome-ignore lint/nursery/useExplicitType: <explanation>
      currentConnection: () => connectionDetailModel,
      currentConnectionId: 1,
      connections: [connectionListItemModel]
    })
  }));
};

describe('Histories.tsx', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('should render history list', async () => {
    const { getByText } = renderBrowser(<Histories />);
    mockConnection();

    await expect.element(getByText('SELECT * FROM "data_src" LIMIT 100 OFFSET 0;')).toBeInTheDocument();
  });

  test('should show loading state', async () => {
    const { getByTestId, getByText } = renderBrowser(<Histories />);

    await expect.element(getByTestId('linear-progress')).toBeInTheDocument();
    await expect.element(getByText('SELECT * FROM "data_src" LIMIT 100 OFFSET 0;')).not.toBeInTheDocument();
  });

  //   test('should filter histories on search', async () => {
  //     render(
  //       <MemoryRouter>
  //         <Histories histories={mockHistories} isLoading={false} />
  //       </MemoryRouter>
  //     );

  //     const searchInput = screen.getByPlaceholderText('Search');
  //     await userEvent.type(searchInput, 'users');

  //     expect(screen.getByText('SELECT * FROM users')).toBeInTheDocument();
  //     expect(screen.queryByText('SELECT * FROM posts')).not.toBeInTheDocument();
  //   });

  //   test('should handle refresh', async () => {
  //     const onRefresh = vi.fn();
  //     render(
  //       <MemoryRouter>
  //         <Histories
  //           histories={mockHistories}
  //           isLoading={false}
  //           onRefresh={onRefresh}
  //         />
  //       </MemoryRouter>
  //     );

  //     const refreshButton = screen.getByRole('button', { name: /refresh/i });
  //     await userEvent.click(refreshButton);

  //     expect(onRefresh).toHaveBeenCalled();
  //   });
});
