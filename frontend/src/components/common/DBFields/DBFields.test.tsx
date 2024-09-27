import { transformRunQuery } from '@/api/query/transformers.ts';
import { queryModel } from '@/core/mocks/handlers/queries.ts';
import * as data from '@/store/dataStore/data.store.ts';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import DBFields from './DBFields';

describe('DBField.tsx', () => {
  const spy = vi.spyOn(data, 'useDataStore');
  const mockGetHighlightedRow = vi.fn();
  const mockGetColumns = vi.fn();

  beforeEach(() => {
    spy.mockReturnValue({
      getHighlightedRow: mockGetHighlightedRow,
      getColumns: mockGetColumns
    });
  });

  test('should render the the db fields', () => {
    mockGetHighlightedRow.mockReturnValue([]);
    mockGetColumns.mockReturnValue([]);
    render(
      <BrowserRouter>
        <DBFields />
      </BrowserRouter>
    );
    expect(screen.getByTestId('db-field')).not.toBeNull();
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

    const inputElement = await screen.findAllByPlaceholderText('Search');
    await userEvent.type(inputElement[0], 'auth');
    expect(inputElement[0]).toHaveValue('auth');

    expect(screen.queryByText('datasrc_id')).toBeNull();
    expect(screen.getByText('authors')).toBeVisible();
  });

  test('should show noting without highlightedRow', async () => {
    const data = transformRunQuery(queryModel);
    mockGetHighlightedRow.mockReturnValue(null);
    mockGetColumns.mockReturnValue(data.structures);
    render(
      <BrowserRouter>
        <DBFields />
      </BrowserRouter>
    );

    expect(screen.queryByTestId('db-field')).toBeNull();
  });

  test('should skip wrong property of row', async () => {
    const data = transformRunQuery(queryModel);
    const columns = data.structures;
    columns[0].test_fake_row = 'test';

    mockGetHighlightedRow.mockReturnValue(data.data[0]);
    mockGetColumns.mockReturnValue(columns);
    render(
      <BrowserRouter>
        <DBFields />
      </BrowserRouter>
    );

    expect(screen.queryByText('test_fake_row')).toBeNull();
    expect(screen.queryByTestId('db-field')).not.toBeNull();
  });
});
