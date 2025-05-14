import {styled} from '@mui/material';

export const TableHeader = styled('th')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.text,
  fontWeight: 'normal',
  fontSize: theme.typography.subtitle2.fontSize,
  position: 'relative',
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: '2px 8px',
  minWidth: '200px', // Minimum width constraint
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',

  WebkitTransform: 'translateZ(0)',
  transform: 'translateZ(0)',
  transition: 'width 0.1s ease'
}));

export const TableCell = styled('td')(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: '22px',
  boxSizing: 'border-box',
  padding: '2px 8px',
  color: theme.palette.text.text,
  fontSize: theme.typography.subtitle2.fontSize,
  minWidth: '200px', // Minimum width constraint
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  // Safari-friendly performance optimizations
  WebkitTransform: 'translateZ(0)', // Safari hardware acceleration
  transform: 'translateZ(0)', // Hardware acceleration for other browsers
  transition: 'width 0.1s ease', // Add smooth transition for width changes in onChange mode

  '.selected-highlight &': {
    backgroundColor: `${theme.palette.action.selected}`,
    color: theme.palette.text.text
  },

  '.removed-highlight &': {
    backgroundColor: `${theme.palette.background.danger} !important`,
    color: `${theme.palette.text.danger} !important`
  },

  '.unsaved-highlight &': {
    backgroundColor: `${theme.palette.background.success} !important`,
    color: `${theme.palette.text.success} !important`
  },

  '.edit-highlight &': {
    backgroundColor: `${theme.palette.background.warning} !important`,
    color: `${theme.palette.text.warning} !important`
  }
}));

export const StyledTable = styled('table')(({ theme }) => ({
  width: 'max-content', // Use max-content to ensure table expands to fit all columns
  minWidth: '100%', // Ensure table is at least as wide as its container
  borderSpacing: 0,
  tableLayout: 'fixed', // Use fixed layout for better performance with column resizing
  borderCollapse: 'separate' // Needed for fixed layout
}));

export const CellContent = styled('div')(({ theme }) => ({
  width: '100%',
  height: '22px',
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  // Optimize for animations
  willChange: 'contents',
  // Add a slight transition for smoother interactions
  transition: 'background-color 0.1s ease'
}));

export const CellInput = styled('input')(({ theme }) => ({
  width: '100%',
  height: '22px',
  maxWidth: '100%',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  outline: 'none',
  boxSizing: 'border-box'
}));

export const TableContainer = styled('div')(({ theme }) => ({
  width: '100%',
  height: '100%',
  overflow: 'auto',
  position: 'relative',
  // Optimize scrolling performance
  overscrollBehavior: 'contain',
  // Prevent text selection during scrolling
  userSelect: 'none',
  // Hardware acceleration for smoother scrolling
  transform: 'translateZ(0)',
  willChange: 'scroll-position',
  // Improve touch scrolling on mobile devices
  WebkitOverflowScrolling: 'touch'
}));

export const StyledTableRow = styled('tr')(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.background.subdued
  }
}));

export const Resizer = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: -3, // Position it to extend slightly outside the cell for easier grabbing
  top: 0,
  height: '100%',
  width: '5px', // Wider for easier grabbing
  // background: theme.palette.divider, // Slightly visible by default
  cursor: 'col-resize',
  userSelect: 'none',
  touchAction: 'none',
  zIndex: 100, // Higher z-index to ensure it's above other elements
  // Safari-friendly performance optimizations
  WebkitTransform: 'translateZ(0)', // Safari hardware acceleration
  transform: 'translateZ(0)', // Hardware acceleration for other browsers
  transition: 'background-color 0.1s ease, width 0.1s ease', // Smooth transitions for properties
  '&:hover': {
    background: theme.palette.primary.main,
    opacity: 0.7, // More visible on hover
    width: '8px' // Slightly wider on hover
  },
  '&.isResizing': {
    background: theme.palette.primary.main,
    opacity: 0.8, // More visible when resizing
    // Wider hit area during resize for better UX
    width: '5px'
  }
}));

export const CellContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  // Optimize for animations
  willChange: 'contents',
  // Prevent text selection for better performance during scrolling
  userSelect: 'none',
  // Enable text selection only when cell is being edited or hovered
  '.cell-hover &, .editing &': {
    userSelect: 'text'
  }
}));

export const EditButton = styled('button')(({ theme }) => ({
  position: 'absolute',
  right: '2px',
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  border: 'none',
  borderRadius: '3px',
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity 0.2s',
  '&:hover': {
    opacity: 1
  },
  '.cell-hover &': {
    opacity: 0.7
  }
}));
