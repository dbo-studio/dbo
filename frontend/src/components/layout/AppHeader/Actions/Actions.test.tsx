import * as sa from '@/store/settingStore/setting.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import Actions from './Actions.tsx';

describe('Actions.tsx', () => {
  const spy = vi.spyOn(sa, 'useSettingStore');
  const mockUpdateSidebar = vi.fn();

  beforeEach(() => {
    vi.mock('@/store/settingStore/setting.store.ts', () => ({
      useSettingStore: vi.fn()
    }));

    spy.mockReturnValue({
      sidebar: {
        leftWidth: 285,
        rightWidth: 285,
        showLeft: true,
        showRight: true
      },
      updateSidebar: mockUpdateSidebar
    });
  });

  test('should render the the Actions', () => {
    render(<Actions />);
    expect(screen.getByLabelText('sideRight')).not.toBeNull();
    expect(screen.getByLabelText('sideLeft')).not.toBeNull();
  });

  test('should update close right sidebar', async () => {
    render(<Actions />);
    await userEvent.click(screen.getByLabelText('sideRight'));

    expect(mockUpdateSidebar).toHaveBeenCalledWith({
      showRight: false
    });
  });

  test('should update open right sidebar', async () => {
    spy.mockReturnValue({
      sidebar: {
        leftWidth: 285,
        rightWidth: 285,
        showLeft: true,
        showRight: false
      },
      updateSidebar: mockUpdateSidebar
    });

    render(<Actions />);

    await userEvent.click(screen.getByLabelText('sideRight'));

    expect(mockUpdateSidebar).toHaveBeenCalledWith({
      showRight: true,
      rightWidth: 285
    });
  });

  test('should update close left sidebar', async () => {
    render(<Actions />);
    await userEvent.click(screen.getByLabelText('sideLeft'));

    expect(mockUpdateSidebar).toHaveBeenCalledWith({
      showLeft: false
    });
  });

  test('should update open left sidebar', async () => {
    spy.mockReturnValue({
      sidebar: {
        leftWidth: 285,
        rightWidth: 285,
        showLeft: false,
        showRight: false
      },
      updateSidebar: mockUpdateSidebar
    });
    render(<Actions />);
    await userEvent.click(screen.getByLabelText('sideLeft'));

    expect(mockUpdateSidebar).toHaveBeenCalledWith({
      showLeft: true,
      leftWidth: 285
    });
  });
});
