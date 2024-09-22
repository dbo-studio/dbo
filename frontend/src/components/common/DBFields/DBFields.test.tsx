import * as data from '@/store/dataStore/data.store.ts';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import DBFields from './DBFields';
import { transformRunQuery } from '@/api/query/transformers.ts';
import { queryModel } from '@/core/mocks/handlers/queries.ts';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

describe('DBField.tsx', () => {
  const spy = vi.spyOn(data, 'useDataStore');
  const mockGetHighlightedRow = vi.fn();
  const mockGetColumns = vi.fn();

  beforeEach(() => {
    spy.mockReturnValue({
      getHighlightedRow: mockGetHighlightedRow,
      getColumns: mockGetColumns
    });

    render(
      <BrowserRouter>
        <DBFields />
      </BrowserRouter>
    );
  });

  test('should render the the db fields', () => {
    mockGetHighlightedRow.mockReturnValue([]);
    mockGetColumns.mockReturnValue([]);
    const element = document.getElementById('db-field');
    expect(element).toBeNull();
  });

  test('should render fields', () => {
    const data = transformRunQuery(queryModel);
    mockGetHighlightedRow.mockReturnValue(data.data[0]);
    mockGetColumns.mockReturnValue(data.structures);
    render(
      <BrowserRouter>
        <DBFields />
      </BrowserRouter>
    );

    expect(screen.getByText('datasrc_id')).not.toBeNull();
  });

  test('should show correct fields after search', async () => {
    const data = transformRunQuery(queryModel);
    mockGetHighlightedRow.mockReturnValue(data.data[0]);
    mockGetColumns.mockReturnValue(data.structures);
    render(
      <BrowserRouter>
        <DBFields />
      </BrowserRouter>
    );

    expect(screen.getByText('datasrc_id')).not.toBeNull();
    const inputElement = await screen.findAllByPlaceholderText('Search');
    await userEvent.type(inputElement[0], 'auth');
    expect(inputElement[0]).toHaveValue('auth');

    render(
        <BrowserRouter>
          <DBFields />
        </BrowserRouter>
    );

    // expect(screen.getByText('datasrc_id')).toBeNull();
    expect(screen.getByText('authors')).not.toBeNull();
  });
});
