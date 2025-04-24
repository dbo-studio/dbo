import { screen } from '@testing-library/dom';
import AppHeader from './AppHeader';
import { renderWithProviders } from '@/test/test-utils';

describe('AppHeader.tsx', () => {
  test('should render the the App Header', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByLabelText('settings')).not.toBeNull();
  });
});
