import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import type { MenuPanelTabType } from '../types';
import MenuPanel from './MenuPanel';

const tabs: MenuPanelTabType[] = [
  { id: 1, name: 'Tab1', icon: 'about', onlyDesktop: false, content: <></> },
  { id: 2, name: 'Tab2', icon: 'about', onlyDesktop: true, content: <></> }
];

describe('MenuPanel.tsx', () => {
  test('should render the the about panel with correct tabs in web', () => {
    renderWithProviders(<MenuPanel tabs={tabs} onChange={() => {}} />);
    expect(screen.getAllByText('Tab1')).not.toBeNull();
    expect(screen.queryByText('Tab2')).toBeNull();
  });
});
