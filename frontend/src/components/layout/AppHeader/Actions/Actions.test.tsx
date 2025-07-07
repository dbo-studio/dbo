import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';

import Actions from './Actions.tsx';

describe('Actions.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the Actions', () => {
    setupStoreMocks.settingStore({
      sidebar: {
        leftWidth: 285,
        rightWidth: 285,
        showLeft: true,
        showRight: true
      }
    });

    renderWithProviders(<Actions />);
    expect(screen.getByLabelText('sideRight')).not.toBeNull();
    expect(screen.getByLabelText('sideLeft')).not.toBeNull();
  });

  test('should update close right sidebar', async () => {
    const mockUpdateSidebar = createSpy();

    setupStoreMocks.settingStore({
      sidebar: {
        leftWidth: 285,
        rightWidth: 285,
        showLeft: true,
        showRight: true
      },
      updateSidebar: mockUpdateSidebar
    });

    renderWithProviders(<Actions />);
    await userEvent.click(screen.getByLabelText('sideRight'));

    expect(mockUpdateSidebar).toHaveBeenCalledWith({
      showRight: false
    });
  });

  test('should update open right sidebar', async () => {
    const mockUpdateSidebar = createSpy();

    setupStoreMocks.settingStore({
      sidebar: {
        leftWidth: 285,
        rightWidth: 285,
        showLeft: true,
        showRight: false
      },
      updateSidebar: mockUpdateSidebar
    });

    renderWithProviders(<Actions />);

    await userEvent.click(screen.getByLabelText('sideRight'));

    expect(mockUpdateSidebar).toHaveBeenCalledWith({
      showRight: true,
      rightWidth: 285
    });
  });

  test('should update close left sidebar', async () => {
    const mockUpdateSidebar = createSpy();

    setupStoreMocks.settingStore({
      sidebar: {
        leftWidth: 285,
        rightWidth: 285,
        showLeft: true,
        showRight: true
      },
      updateSidebar: mockUpdateSidebar
    });

    renderWithProviders(<Actions />);
    await userEvent.click(screen.getByLabelText('sideLeft'));

    expect(mockUpdateSidebar).toHaveBeenCalledWith({
      showLeft: false
    });
  });

  test('should update open left sidebar', async () => {
    const mockUpdateSidebar = createSpy();

    setupStoreMocks.settingStore({
      sidebar: {
        leftWidth: 285,
        rightWidth: 285,
        showLeft: false,
        showRight: false
      },
      updateSidebar: mockUpdateSidebar
    });

    renderWithProviders(<Actions />);
    await userEvent.click(screen.getByLabelText('sideLeft'));

    expect(mockUpdateSidebar).toHaveBeenCalledWith({
      showLeft: true,
      leftWidth: 285
    });
  });
});
