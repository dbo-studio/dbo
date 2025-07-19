import SavedQueries from '@/components/common/SavedQueries/SavedQueries';
import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

describe('SavedQueries.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('renders saved queries', async () => {
    await setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(connectionDetailModel)
    });

    renderWithProviders(<SavedQueries />);
    await waitFor(() => {
      expect(screen.queryByText('data_src')).toBeVisible();
    });
  });
});
