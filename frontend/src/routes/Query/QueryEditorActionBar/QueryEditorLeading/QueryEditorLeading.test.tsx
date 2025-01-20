import locales from '@/locales';
import QueryEditorLeading from '@/routes/Query/QueryEditorActionBar/QueryEditorLeading/QueryEditorLeading.tsx';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, vi } from 'vitest';

describe('QueryEditorLeading.tsx', () => {
  const spy = vi.spyOn(conn, 'useConnectionStore');

  test('should render the the QueryEditorLeading', () => {
    spy.mockReturnValue({
      schemas: [],
      databases: []
    });

    render(<QueryEditorLeading onChange={() => {}} />);
    expect(screen.queryByText(locales.no_active_database_find)).not.toBeNull();
    expect(screen.queryByText(locales.no_active_schema_find)).not.toBeNull();
  });

  test('should call should see options after click on select', async () => {
    spy.mockReturnValue({
      currentSchema: 'selected_schema',
      currentDatabase: 'selected_db',
      schemas: ['selected_schema', 'public_schema'],
      databases: ['selected_db', 'public_db']
    });

    render(<QueryEditorLeading onChange={() => {}} />);

    expect(screen.getByText('selected_schema')).not.toBeNull();
    expect(screen.getByText('selected_db')).not.toBeNull();
    expect(screen.queryByText('public_schema')).toBeNull();
    expect(screen.queryByText('public_db')).toBeNull();

    await userEvent.click(screen.getByText('selected_schema'));
    expect(screen.getByText('public_schema')).not.toBeNull();

    await userEvent.click(screen.getByText('selected_db'));
    expect(screen.getByText('public_db')).not.toBeNull();
  });

  test('should onChange called after select change', async () => {
    const onChangeMock = vi.fn();

    spy.mockReturnValue({
      currentSchema: 'selected_schema',
      currentDatabase: 'selected_db',
      schemas: ['selected_schema', 'public_schema'],
      databases: ['selected_db', 'public_db']
    });

    render(<QueryEditorLeading onChange={onChangeMock} />);

    expect(screen.getByText('selected_schema')).not.toBeNull();
    await userEvent.click(screen.getByText('selected_schema'));
    await userEvent.click(screen.getByText('public_schema'));

    expect(onChangeMock).toHaveBeenCalled();
  });
});
