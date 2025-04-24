import SavedQueries from '@/components/common/SavedQueries/SavedQueries';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { describe, expect, vi } from 'vitest';
import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { waitFor } from '@testing-library/react';

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
