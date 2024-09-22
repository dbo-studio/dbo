import locales from '@/locales';
import * as data from '@/store/dataStore/data.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ConnectionBox from './ConnectionBox';
import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import { transformConnectionDetail } from '@/api/connection/transformers.ts';
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

    const { getByTestId } = render(
      <BrowserRouter>
        <DBFields />
      </BrowserRouter>
    );

    expect(getByTestId('db-field')).toBeNull();
  });

  //   test('should with connection', () => {
  //     const connection = transformConnectionDetail(connectionDetailModel);
  //     spy.mockReturnValue({
  //       currentConnection: connection
  //     });

  //     render(
  //       <BrowserRouter>
  //         <DBFields />
  //       </BrowserRouter>
  //     );
  //     const txt = `${connection?.driver} ${connection?.version} ${connection.currentSchema}: ${connection?.name} SQL Query`;
  //     expect(screen.getByText(txt)).not.toBeNull();
  //   });
});
