import locales from '@/locales';
import Filters from '@/routes/Data/Filters/Filters.tsx';
import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';

describe('Filters.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render with zero filter Filters', () => {
    setupStoreMocks.dataStore({
      getColumns: createSpy().mockReturnValue([]),
      runQuery: createSpy()
    });

    setupStoreMocks.tabStore({
      selectedTab: createSpy().mockReturnValue({
        filters: []
      })
    });

    renderWithProviders(<Filters />);

    expect(screen.queryByLabelText('add-filter-btn')).not.toBeNull();
    expect(screen.queryByLabelText('filter-item')).toBeNull();
    expect(screen.queryByText(locales.apply)).toBeNull();
  });

  test('should render with filters Filters', async () => {
    setupStoreMocks.dataStore({
      getColumns: createSpy().mockReturnValue([]),
      runQuery: createSpy()
    });

    setupStoreMocks.tabStore({
      selectedTab: createSpy().mockReturnValue({
        filters: [
          {
            index: '0',
            column: 'test_1',
            operator: '=',
            value: 'value_1',
            next: 'ASC',
            isActive: true
          }
        ]
      })
    });

    renderWithProviders(<Filters />);

    expect(screen.queryByLabelText('add-filter-btn')).not.toBeNull();
    expect(screen.queryByLabelText('filter-item')).not.toBeNull();
    expect(screen.queryByText(locales.apply)).not.toBeNull();
  });
});
