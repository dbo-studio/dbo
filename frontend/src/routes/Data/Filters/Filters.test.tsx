import locales from '@/locales';
import Filters from '@/routes/Data/Filters/Filters.tsx';
import * as data from '@/store/dataStore/data.store.ts';
import * as tab from '@/store/tabStore/tab.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { describe, expect, vi } from 'vitest';

describe('Filters.tsx', () => {
  const dataSpy = vi.spyOn(data, 'useDataStore');
  const tabSpy = vi.spyOn(tab, 'useTabStore');
  const getSelectedTabMock = vi.fn();

  beforeEach(() => {
    dataSpy.mockReturnValue({
      getColumns: vi.fn().mockReturnValue([]),
      runQuery: vi.fn()
    });
  });

  test('should render the with zero filter Filters', () => {
    getSelectedTabMock.mockReturnValue({
      filters: []
    });

    tabSpy.mockReturnValue({
      getSelectedTab: getSelectedTabMock
    });

    render(<Filters />);

    expect(screen.queryByLabelText('add-filter-btn')).not.toBeNull();
    expect(screen.queryByLabelText('filter-item')).toBeNull();
    expect(screen.queryByText(locales.apply)).toBeNull();
  });

  test('should render the with filters Filters', async () => {
    getSelectedTabMock.mockReturnValue({
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
    });

    tabSpy.mockReturnValue({
      getSelectedTab: getSelectedTabMock
    });

    render(<Filters />);

    expect(screen.queryByLabelText('add-filter-btn')).not.toBeNull();
    expect(screen.queryByLabelText('filter-item')).not.toBeNull();
    expect(screen.queryByText(locales.apply)).not.toBeNull();
  });
});
