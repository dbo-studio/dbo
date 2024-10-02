import type {} from '@emotion/styled';
import { styled } from '@mui/material';
import type {} from '@mui/system';
import DataGrid from 'react-data-grid';

export const DataGridStyled = styled(DataGrid)(({ theme }) => ({
  '--rdg-font-size': theme.typography.body1.fontSize,
  '--rdg-color': theme.palette.text.text,
  '--rdg-border-color': theme.palette.divider,
  '--rdg-summary-border-color': '#555',
  '--rdg-background-color': theme.palette.background.default,
  '--rdg-header-background-color': theme.palette.background.paper,
  '--rdg-header-draggable-background-color': 'hsl(0deg 0% 17.5%)',
  '--rdg-row-hover-background-color': theme.palette.action.selected,
  '--rdg-row-selected-background-color': theme.palette.action.selected,
  '--rdg-row-selected-hover-background-color': theme.palette.action.selected,
  '--rdg-checkbox-color': 'hsl(207deg 100% 79%)',
  '--rdg-checkbox-focus-color': 'hsl(207deg 100% 89%)',
  '--rdg-checkbox-disabled-border-color': '#000',
  '--rdg-checkbox-disabled-background-color': '#333',

  flex: 1,
  '.h44jtk67-0-0-beta-47': {
    flex: 1
  },
  '.cj343x07-0-0-beta-47': {
    minHeight: '30px',
    maxHeight: '30px',
    whiteSpace: 'nowrap',
    overflow: 'clip',
    textOverflow: 'ellipsis',
    outline: 'none',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingRight: theme.spacing(1)
  },
  '.rdg-header-sort-name': {
    paddingRight: theme.spacing(1 / 2)
  },
  '.edit-highlight': {
    '.rdg-cell': {
      backgroundColor: theme.palette.background.warning
    }
  },
  '.unsaved-highlight': {
    '.rdg-cell': {
      backgroundColor: theme.palette.background.success
    }
  },
  '.removed-highlight': {
    '.rdg-cell': {
      backgroundColor: theme.palette.background.danger
    }
  }
}));
