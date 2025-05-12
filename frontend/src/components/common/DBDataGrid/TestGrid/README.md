# TestGrid Component

## Overview

The TestGrid component is a virtualized data grid that efficiently handles large datasets with millions of rows. It provides features like column resizing, row selection, cell editing, and more.

## Custom Column Resizing

The component uses a custom column resizing solution that:

1. Only resizes columns from the right side
2. Ensures the checkbox column remains non-resizable
3. Maintains good performance even with large datasets

## Component Structure

The TestGrid component is organized into several smaller components:

- **TestGrid.tsx**: The main entry point that renders the CustomTestGrid component
- **components/CustomTestGrid.tsx**: The implementation of the data grid with virtualization and custom column resizing
- **components/CustomTableHeaderRow.tsx**: Renders the table header with custom resizers
- **components/CustomTableBodyRows.tsx**: Renders the table body with virtualized rows
- **components/CustomResizer.tsx**: The resizer component that handles column resizing
- **hooks/useColumnResize.ts**: A custom hook that manages column resizing state and logic
- **hooks/useTableColumns.tsx**: Defines the table columns with their cell renderers
- **hooks/useHandleScroll.ts**: Handles scroll events for the table container

## How Column Resizing Works

1. The `useColumnResize` hook manages the state of column sizes and provides handlers for resizing
2. The `CustomResizer` component renders a draggable handle on the right side of each column header
3. When a user drags the resizer, the column width is updated in the `columnSizes` state
4. Both the header and body cells use the `columnSizes` state to determine their width

## Performance Optimizations

- **Virtualization**: Only renders the rows that are visible in the viewport
- **Memoization**: Uses React.memo and useMemo to prevent unnecessary re-renders
- **Hardware Acceleration**: Uses CSS properties like `transform: translateZ(0)` and `will-change` for better performance
- **Fixed Table Layout**: Uses `table-layout: fixed` for better performance with column resizing

## Usage

```tsx
import TestGrid from '@/components/common/DBDataGrid/TestGrid/TestGrid';

function MyComponent() {
  return (
    <TestGrid
      rows={rows}
      columns={columns}
      loading={loading}
      editable={true}
    />
  );
}
```