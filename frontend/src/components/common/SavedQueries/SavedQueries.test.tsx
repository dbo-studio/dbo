import SavedQueries from '@/components/common/SavedQueries/SavedQueries';
import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/react';
import { describe, expect, vi } from 'vitest';

describe('SavedQueries.tsx', () => {
  const spyConnection = vi.spyOn(conn, 'useConnectionStore');

  it('renders saved queries', async () => {
    spyConnection.mockReturnValue({
      // biome-ignore lint/nursery/useExplicitType: <explanation>
      currentConnection: () => connectionDetailModel
    });

    renderWithProviders(<SavedQueries />);
    await waitFor(() => {
      expect(screen.queryByText('data_src')).toBeVisible();
    });
  });
});
