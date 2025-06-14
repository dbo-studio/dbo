import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import AppHeader from './AppHeader';

describe('AppHeader.tsx', () => {
  test('should render the the App Header', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByLabelText('settings')).not.toBeNull();
  });
});
