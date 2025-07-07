import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
    createMockData,
    createSpy,
    renderWithProviders,
    resetAllMocks,
    setupStoreMocks,
    waitFor
} from '../utils/test-helpers.tsx';

// Example component for testing
const ExampleDataComponent = (): React.ReactElement => {
    return (
        <div>
            <h1>Data Component</h1>
            <button type="button" data-testid="load-data">Load Data</button>
            <button type="button" data-testid="toggle-debug">Toggle Debug</button>
            <div data-testid="data-content">No data loaded</div>
        </div>
    );
};

describe('Integration Test Example', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    test('should handle complete data flow with multiple stores', async () => {
        // Setup mock data
        const mockData = createMockData.tableData(10, 5);
        const mockConnection = createMockData.connection(1);
        const mockTab = createMockData.tab('tab1', 'Test Table');

        // Setup store mocks
        setupStoreMocks.connectionStore({
            connections: [mockConnection],
            currentConnectionId: 1
        });

        setupStoreMocks.dataStore({
            loadDataFromIndexedDB: createSpy().mockResolvedValue(mockData),
            getColumns: createSpy().mockReturnValue(mockData.columns),
            getRows: createSpy().mockReturnValue(mockData.rows)
        });

        setupStoreMocks.tabStore({
            selectedTabId: 'tab1',
            selectedTab: createSpy().mockReturnValue(mockTab)
        });

        setupStoreMocks.settingStore({
            debug: false,
            toggleDebug: createSpy()
        });

        renderWithProviders(<ExampleDataComponent />);

        // Wait for component to load
        await waitFor(100);

        expect(screen.getByText('Data Component')).toBeInTheDocument();
        expect(screen.getByTestId('load-data')).toBeInTheDocument();
        expect(screen.getByTestId('toggle-debug')).toBeInTheDocument();
    });

    test('should handle user interactions with store updates', async () => {
        const mockToggleDebug = createSpy();

        setupStoreMocks.settingStore({
            debug: false,
            toggleDebug: mockToggleDebug
        });

        renderWithProviders(<ExampleDataComponent />);

        const debugToggle = screen.getByTestId('toggle-debug');
        fireEvent.click(debugToggle);

        expect(mockToggleDebug).toHaveBeenCalledWith(true);
    });

    test('should handle error states gracefully', async () => {
        setupStoreMocks.dataStore({
            loadDataFromIndexedDB: createSpy().mockRejectedValue(new Error('API Error'))
        });

        renderWithProviders(<ExampleDataComponent />);

        await waitFor(100);

        expect(screen.getByTestId('data-content')).toHaveTextContent('No data loaded');
    });

    test('should work with multiple store interactions', async () => {
        const mockLoadData = createSpy().mockResolvedValue(createMockData.tableData(5, 3));
        const mockToggleDebug = createSpy();
        const mockUpdateTab = createSpy();

        setupStoreMocks.dataStore({
            loadDataFromIndexedDB: mockLoadData
        });

        setupStoreMocks.settingStore({
            debug: true,
            toggleDebug: mockToggleDebug
        });

        setupStoreMocks.tabStore({
            selectedTabId: 'tab1',
            updateTab: mockUpdateTab
        });

        renderWithProviders(<ExampleDataComponent />);

        // Simulate user interactions
        fireEvent.click(screen.getByTestId('load-data'));
        fireEvent.click(screen.getByTestId('toggle-debug'));

        await waitFor(100);

        expect(mockLoadData).toHaveBeenCalled();
        expect(mockToggleDebug).toHaveBeenCalledWith(false);
    });
}); 