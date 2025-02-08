import SavedQueries from '@/components/common/SavedQueries/SavedQueries';
import * as useSavedQueryStore from '@/store/savedQueryStore/savedQuery.store';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

describe('SavedQueries.tsx', () => {
  const spy = vi.spyOn(useSavedQueryStore, 'useSavedQueryStore');
  const mockUpsertQuery = vi.fn();
  const mockDeleteQuery = vi.fn();

  beforeEach(() => {
    spy.mockReturnValue({
      savedQueries: [
        {
          id: 1,
          name: 'test',
          query: 'test query'
        }
      ],
      upsertQuery: mockUpsertQuery,
      deleteQuery: mockDeleteQuery
    });
  });

  it('renders saved queries', () => {
    render(
      <MemoryRouter>
        <SavedQueries />
      </MemoryRouter>
    );

    expect(screen.queryByText('test')).toBeVisible();
  });
});
