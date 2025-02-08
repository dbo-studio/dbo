import { transformRunQuery } from '@/api/query/transformers.ts';
import { structureModel } from '@/core/mocks/handlers/queries.ts';
import * as useDataStore from '@/store/dataStore/data.store.ts';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import DBFields from './DBFields';

describe('DBField.tsx', () => {
  const spy = vi.spyOn(useDataStore, 'useDataStore');
  const mockGetColumns = vi.fn();
  const mockSelectedRows = vi.fn();

  beforeEach(() => {
    spy.mockReturnValue({
      getColumns: mockGetColumns,
      getSelectedRows: mockSelectedRows
    });
  });

  test('should render the the db fields', () => {
    const data = transformRunQuery(structureModel);
    mockGetColumns.mockReturnValue(data.structures);
    mockSelectedRows.mockReturnValue([
      {
        index: 0,
        data: data.data[0]
      }
    ]);

    render(
      <MemoryRouter>
        <DBFields />
      </MemoryRouter>
    );
    expect(screen.getByTestId('db-field')).not.toBeNull();
  });

  test('should render fields', () => {
    const data = transformRunQuery(structureModel);
    mockGetColumns.mockReturnValue(data.structures);
    mockSelectedRows.mockReturnValue([
      {
        index: 0,
        data: data.data[0]
      }
    ]);
    render(
      <MemoryRouter>
        <DBFields />
      </MemoryRouter>
    );

    expect(screen.getByText('datasrc_id')).not.toBeNull();
  });

  test('should show correct fields after search', async () => {
    const data = transformRunQuery(structureModel);
    mockGetColumns.mockReturnValue(data.structures);
    mockSelectedRows.mockReturnValue([
      {
        index: 0,
        data: data.data[0]
      }
    ]);
    render(
      <MemoryRouter>
        <DBFields />
      </MemoryRouter>
    );

    const inputElement = await screen.findAllByPlaceholderText('Search');
    await userEvent.type(inputElement[0], 'auth');
    expect(inputElement[0]).toHaveValue('auth');

    expect(screen.queryByText('datasrc_id')).toBeNull();
    expect(screen.getByText('authors')).toBeVisible();
  });

  test('should skip wrong property of row', async () => {
    const data = transformRunQuery(structureModel);
    const columns = data.structures;
    // @ts-ignore
    columns[0].test_fake_row = 'test';
    mockGetColumns.mockReturnValue(columns);
    mockSelectedRows.mockReturnValue([
      {
        index: 0,
        data: data.data[0]
      }
    ]);

    render(
      <MemoryRouter>
        <DBFields />
      </MemoryRouter>
    );

    expect(screen.queryByText('test_fake_row')).toBeNull();
    expect(screen.queryByTestId('db-field')).not.toBeNull();
  });
});
