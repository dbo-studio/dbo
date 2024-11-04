import locales from '@/locales';
import QueryEditorLeading from '@/routes/Query/QueryEditorActionBar/QueryEditorLeading/QueryEditorLeading.tsx';
import * as conn from '@/store/connectionStore/connection.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, vi } from 'vitest';

describe('QueryEditorLeading.tsx', () => {
  const spy = vi.spyOn(conn, 'useConnectionStore');

  beforeEach(() => {
    spy.mockReturnValue({
      currentConnection: {
        schemas: [],
        databases: []
      }
    });
  });

  test('should render the the QueryEditorLeading', () => {
    render(<QueryEditorLeading onChange={() => {}} />);
    expect(screen.queryByText(locales.no_active_database_find)).not.toBeNull();
    expect(screen.queryByText(locales.no_active_schema_find)).not.toBeNull();
  });

  test('should call onChange event when change select', async () => {
    render(<QueryEditorLeading onChange={() => {}} />);
    await userEvent.click(screen.getByLabelText('sideRight'));

    expect(spy).toHaveBeenCalledWith({
      showRight: false
    });
  });
  //
  // test('should update open right sidebar', async () => {
  //     spy.mockReturnValue({
  //         sidebar: {
  //             leftWidth: 285,
  //             rightWidth: 285,
  //             showLeft: true,
  //             showRight: false
  //         },
  //         updateSidebar: mockUpdateSidebar
  //     });
  //
  //     render(<Actions />);
  //
  //     await userEvent.click(screen.getByLabelText('sideRight'));
  //
  //     expect(mockUpdateSidebar).toHaveBeenCalledWith({
  //         showRight: true,
  //         rightWidth: 285
  //     });
  // });

  // test('should update close left sidebar', async () => {
  //     render(<Actions />);
  //     await userEvent.click(screen.getByLabelText('sideLeft'));
  //
  //     expect(mockUpdateSidebar).toHaveBeenCalledWith({
  //         showLeft: false
  //     });
  // });
  //
  // test('should update open left sidebar', async () => {
  //     spy.mockReturnValue({
  //         sidebar: {
  //             leftWidth: 285,
  //             rightWidth: 285,
  //             showLeft: false,
  //             showRight: false
  //         },
  //         updateSidebar: mockUpdateSidebar
  //     });
  //     render(<Actions />);
  //     await userEvent.click(screen.getByLabelText('sideLeft'));
  //
  //     expect(mockUpdateSidebar).toHaveBeenCalledWith({
  //         showLeft: true,
  //         leftWidth: 285
  //     });
  // });
});
