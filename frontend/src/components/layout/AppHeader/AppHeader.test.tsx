import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppHeader from './AppHeader';

describe('AppHeader.tsx', () => {
  test('should render the the App Header', () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('settings')).not.toBeNull();
  });
});
