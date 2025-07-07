import locales from '@/locales';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';

describe('Sorts.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render with zero sort Sorts', () => {
    setupStoreMocks.dataStore({
      getColumns: createSpy().mockReturnValue([]),
      runQuery: createSpy()
    });

    setupStoreMocks.tabStore({
      selectedTab: createSpy().mockReturnValue({
        sorts: []
      })
    });

    renderWithProviders(<Sorts />);

    expect(screen.queryByLabelText('add-sort-btn')).not.toBeNull();
    expect(screen.queryByLabelText('sort-item')).toBeNull();
    expect(screen.queryByText(locales.apply)).toBeNull();
  });

  test('should render with sorts Sorts', async () => {
    setupStoreMocks.dataStore({
      getColumns: createSpy().mockReturnValue([]),
      runQuery: createSpy()
    });

    setupStoreMocks.tabStore({
      selectedTab: createSpy().mockReturnValue({
        sorts: [
          {
            index: '0',
            column: 'test_1',
            operator: '=',
            isActive: true
          }
        ]
      })
    });

    renderWithProviders(<Sorts />);

    expect(screen.queryByLabelText('add-sort-btn')).not.toBeNull();
    expect(screen.queryByLabelText('sort-item')).not.toBeNull();
    expect(screen.queryByText(locales.apply)).not.toBeNull();
  });
});
