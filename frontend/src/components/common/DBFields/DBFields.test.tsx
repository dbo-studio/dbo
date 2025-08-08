import { structureModel } from '@/core/mocks/handlers/queries.ts';
import locales from '@/locales';
import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import DBFields from './DBFields';

describe('DBField.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the db fields', () => {
    const data = structureModel;

    setupStoreMocks.dataStore({
      getColumns: createSpy().mockReturnValue(data.structures),
      getSelectedRows: createSpy().mockReturnValue([
        {
          index: 0,
          data: data.data[0]
        }
      ])
    });

    renderWithProviders(<DBFields />);
    expect(screen.getByTestId('db-field')).not.toBeNull();
  });

  test('should render fields', () => {
    const data = structureModel;

    setupStoreMocks.dataStore({
      getColumns: createSpy().mockReturnValue(data.structures),
      getSelectedRows: createSpy().mockReturnValue([
        {
          index: 0,
          data: data.data[0]
        }
      ])
    });

    renderWithProviders(<DBFields />);
    expect(screen.getByText('datasrc_id')).not.toBeNull();
  });

  test('should show correct fields after search', async () => {
    const data = structureModel;

    setupStoreMocks.dataStore({
      getColumns: createSpy().mockReturnValue(data.structures),
      getSelectedRows: createSpy().mockReturnValue([
        {
          index: 0,
          data: data.data[0]
        }
      ])
    });

    renderWithProviders(<DBFields />);

    const inputElement = (await screen.findAllByPlaceholderText(locales.search))[0] as HTMLInputElement;
    await userEvent.type(inputElement, 'auth');

    await waitFor(() => expect(screen.queryByText('datasrc_id')).toBeNull());
    expect(await screen.findByText('authors')).toBeVisible();
  });

  test('should skip wrong property of row', async () => {
    const data = structureModel;
    const columns = data.structures;
    // @ts-ignore
    columns[0].test_fake_row = 'test';

    setupStoreMocks.dataStore({
      getColumns: createSpy().mockReturnValue(columns),
      getSelectedRows: createSpy().mockReturnValue([
        {
          index: 0,
          data: data.data[0]
        }
      ])
    });

    renderWithProviders(<DBFields />);

    expect(screen.queryByText('test_fake_row')).toBeNull();
    expect(screen.queryByTestId('db-field')).not.toBeNull();
  });
});
