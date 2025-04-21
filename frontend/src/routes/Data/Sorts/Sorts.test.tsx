import locales from '@/locales';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import * as data from '@/store/dataStore/data.store.ts';
import * as tab from '@/store/tabStore/tab.store.ts';
import {screen} from '@testing-library/dom';
import {render} from '@testing-library/react';
import {describe, expect, vi} from 'vitest';

describe('Sorts.tsx', () => {
  const dataSpy = vi.spyOn(data, 'useDataStore');
  const tabSpy = vi.spyOn(tab, 'useTabStore');
  const getSelectedTabMock = vi.fn();

  beforeEach(() => {
    dataSpy.mockReturnValue({
      getColumns: vi.fn().mockReturnValue([]),
      runQuery: vi.fn()
    });
  });

  test('should render the with zero sort Sorts', () => {
    getSelectedTabMock.mockReturnValue({
      sorts: []
    });

    tabSpy.mockReturnValue({
      selectedTab: getSelectedTabMock
    });

    render(<Sorts />);

    expect(screen.queryByLabelText('add-sort-btn')).not.toBeNull();
    expect(screen.queryByLabelText('sort-item')).toBeNull();
    expect(screen.queryByText(locales.apply)).toBeNull();
  });

  test('should render the with sorts Sorts', async () => {
    getSelectedTabMock.mockReturnValue({
      sorts: [
        {
          index: '0',
          column: 'test_1',
          operator: '=',
          isActive: true
        }
      ]
    });

    tabSpy.mockReturnValue({
      selectedTab: getSelectedTabMock
    });

    render(<Sorts />);

    expect(screen.queryByLabelText('add-sort-btn')).not.toBeNull();
    expect(screen.queryByLabelText('sort-item')).not.toBeNull();
    expect(screen.queryByText(locales.apply)).not.toBeNull();
  });
});
