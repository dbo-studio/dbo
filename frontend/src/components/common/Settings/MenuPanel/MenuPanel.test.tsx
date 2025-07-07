import { renderWithProviders, resetAllMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import type { MenuPanelTabType } from '../types';
import MenuPanel from './MenuPanel';

const tabs: MenuPanelTabType[] = [
  { id: 1, name: 'Tab1', icon: 'about', onlyDesktop: false, content: <></> },
  { id: 2, name: 'Tab2', icon: 'about', onlyDesktop: true, content: <></> }
];

describe('MenuPanel.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the about panel with correct tabs in web', () => {
    renderWithProviders(<MenuPanel tabs={tabs} onChange={(): void => { }} />);
    expect(screen.getAllByText('Tab1')).not.toBeNull();
    expect(screen.queryByText('Tab2')).toBeNull();
  });
});
