import locales from '@/locales';
import QueryEditorLeading from '@/routes/Query/QueryEditorActionBar/QueryEditorLeading/QueryEditorLeading.tsx';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

describe('QueryEditorLeading.tsx', () => {
  const spy = vi.spyOn(conn, 'useConnectionStore');

  test('should render the QueryEditorLeading with empty options', () => {
    spy.mockReturnValue({
      schemas: [],
      databases: []
    });

    renderWithProviders(<QueryEditorLeading onChange={() => {}} databases={[]} schemas={[]} />);
    expect(screen.getByText(locales.no_active_database_find)).toBeInTheDocument();
    expect(screen.getByText(locales.no_active_schema_find)).toBeInTheDocument();
  });

  test('should show options after clicking on selects', async () => {
    const mockDatabases = ['selected_db', 'public_db'];
    const mockSchemas = ['selected_schema', 'public_schema'];

    renderWithProviders(<QueryEditorLeading databases={mockDatabases} schemas={mockSchemas} onChange={() => {}} />);

    // Click database select
    await userEvent.click(screen.getByText(locales.no_active_database_find));
    expect(screen.getByText('selected_db')).toBeInTheDocument();
    expect(screen.getByText('public_db')).toBeInTheDocument();

    // Click schema select
    await userEvent.click(screen.getByText(locales.no_active_schema_find));
    expect(screen.getByText('selected_schema')).toBeInTheDocument();
    expect(screen.getByText('public_schema')).toBeInTheDocument();
  });

  test('should call onChange with correct values when selections change', async () => {
    const mockDatabases = ['selected_db', 'public_db'];
    const mockSchemas = ['selected_schema', 'public_schema'];
    const onChangeMock = vi.fn();

    renderWithProviders(<QueryEditorLeading databases={mockDatabases} schemas={mockSchemas} onChange={onChangeMock} />);

    // Select database
    await userEvent.click(screen.getByText(locales.no_active_database_find));
    await userEvent.click(screen.getByText('selected_db'));

    expect(onChangeMock).toHaveBeenCalledWith({
      database: 'selected_db',
      schema: ''
    });

    // Select schema
    await userEvent.click(screen.getByText(locales.no_active_schema_find));
    await userEvent.click(screen.getByText('selected_schema'));

    expect(onChangeMock).toHaveBeenCalledWith({
      database: 'selected_db',
      schema: 'selected_schema'
    });
  });
});
