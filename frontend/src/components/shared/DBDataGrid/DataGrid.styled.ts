import { HotTable } from '@handsontable/react-wrapper';
import { styled } from '@mui/material';

export const DataGridStyled = styled(HotTable)(({ theme }) => ({
  '& .handsontable': {
    zIndex: 0
  },
  '& .handsontable td': {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderColor: theme.palette.divider,
    color: theme.palette.text.text,
    backgroundColor: theme.palette.background.default
  },
  '& .handsontable .ht__row_odd td': {
    backgroundColor: `${theme.palette.background.subdued}`
  },
  '& .removed-highlight': {
    backgroundColor: `${theme.palette.background.danger} !important`,
    color: `${theme.palette.text.danger} !important`
  },
  '& .unsaved-highlight': {
    backgroundColor: `${theme.palette.background.success} !important`,
    color: `${theme.palette.text.success} !important`
  },
  '& .edit-highlight': {
    backgroundColor: `${theme.palette.background.warning} !important`,
    fontWeight: `${theme.palette.text.warning} !important`
  },
  'span.colHeader.columnSorting.ascending::before': {
    top: '12px',
    right: '-35px',
    width: '22px',
    height: '22px',
    zoom: '0.4'
  },
  '& span.colHeader.columnSorting.ascending::before, & span.colHeader.columnSorting.descending::before': {
    backgroundImage:
      'url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBVcGxvYWRlZCB0bzogU1ZHIFJlcG8sIHd3dy5zdmdyZXBvLmNvbSwgR2VuZXJhdG9yOiBTVkcgUmVwbyBNaXhlciBUb29scyAtLT4NCjxzdmcgZmlsbD0iIzAwMDAwMCIgaGVpZ2h0PSI4MDBweCIgd2lkdGg9IjgwMHB4IiB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiANCgkgdmlld0JveD0iMCAwIDMzMCAzMzAiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHBhdGggaWQ9IlhNTElEXzIyNV8iIGQ9Ik0zMjUuNjA3LDc5LjM5M2MtNS44NTctNS44NTctMTUuMzU1LTUuODU4LTIxLjIxMywwLjAwMWwtMTM5LjM5LDEzOS4zOTNMMjUuNjA3LDc5LjM5Mw0KCWMtNS44NTctNS44NTctMTUuMzU1LTUuODU4LTIxLjIxMywwLjAwMWMtNS44NTgsNS44NTgtNS44NTgsMTUuMzU1LDAsMjEuMjEzbDE1MC4wMDQsMTUwYzIuODEzLDIuODEzLDYuNjI4LDQuMzkzLDEwLjYwNiw0LjM5Mw0KCXM3Ljc5NC0xLjU4MSwxMC42MDYtNC4zOTRsMTQ5Ljk5Ni0xNTBDMzMxLjQ2NSw5NC43NDksMzMxLjQ2NSw4NS4yNTEsMzI1LjYwNyw3OS4zOTN6Ii8+DQo8L3N2Zz4=) !important',
    top: '12px',
    right: '-35px',
    width: '22px',
    height: '22px',
    zoom: '0.4'
  },
  '& span.colHeader.columnSorting.descending:before': {
    transform: 'scaleY(-1)'
  },
  '& .handsontable thead tr th': {
    borderTop: 'none',
    borderLeft: 'none',
    borderColor: `${theme.palette.divider} !important`,
    color: theme.palette.text.text,
    backgroundColor: theme.palette.background.default
  },
  '& .handsontable tbody tr th': {
    borderLeft: 'none !important',
    borderColor: theme.palette.divider,
    color: theme.palette.text.text,
    backgroundColor: theme.palette.background.default
  },
  '& .handsontable tbody .ht__highlight, .handsontable tbody td.highlight': {
    backgroundColor: `${theme.palette.action.selected}`,
    opacity: '1',
    color: theme.palette.text.text
  },
  '& .handsontable tbody td.highlight:before': {
    opacity: '0'
  },
  '& .handsontable tbody tr td': {
    borderColor: theme.palette.divider
  }
}));
