import Schemas from '@/components/common/DBTreeView/Schemas/Schemas.tsx';
import locales from '@/locales';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, vi } from 'vitest';

describe('Schemas.tsx', () => {
  const spy = vi.spyOn(conn, 'useConnectionStore');

  test('should render the the Schemas', () => {
    spy.mockReturnValue({
      schemas: [],
      databases: []
    });

    render(<Schemas />);
    expect(screen.queryByText(locales.no_active_schema_find)).not.toBeNull();
  });

  test('should call should see options after click on select', async () => {
    spy.mockReturnValue({
      currentSchema: 'selected_schema',
      schemas: ['selected_schema', 'public_schema']
    });

    render(<Schemas />);

    expect(screen.getByText('selected_schema')).not.toBeNull();
    expect(screen.queryByText('public_schema')).toBeNull();

    await userEvent.click(screen.getByText('selected_schema'));
    expect(screen.getByText('public_schema')).not.toBeNull();
  });

  test('should onChange called after select change', async () => {
    const updateCurrentConnectionMock = vi.fn();
    spy.mockReturnValue({
      currentSchema: 'selected_schema',
      schemas: ['selected_schema', 'public_schema'],
      updateCurrentConnection: updateCurrentConnectionMock
    });

    render(<Schemas />);

    expect(screen.getByText('selected_schema')).not.toBeNull();
    await userEvent.click(screen.getByText('selected_schema'));
    await userEvent.click(screen.getByText('public_schema'));

    expect(updateCurrentConnectionMock).toHaveBeenCalled();
  });
});
