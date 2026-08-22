import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { IconButton, InputAdornment, Menu, MenuItem, Tooltip } from '@mui/material';
import { type JSX, type MouseEvent, useState } from 'react';
import { DiagramSearchStyled, DiagramToolbarStyled, ToolbarSpacerStyled } from './DiagramToolbar.styled';

type Props = {
  search: string;
  onSearch: (value: string) => void;
  onAutoLayout: () => void;
  onFit: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
};

export default function DiagramToolbar({
  search,
  onSearch,
  onAutoLayout,
  onFit,
  onExportPng,
  onExportSvg
}: Props): JSX.Element {
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);

  const openExportMenu = (event: MouseEvent<HTMLElement>): void => {
    setExportAnchor(event.currentTarget);
  };

  const closeExportMenu = (): void => {
    setExportAnchor(null);
  };

  return (
    <DiagramToolbarStyled data-testid='diagram-toolbar'>
      <DiagramSearchStyled
        size='small'
        value={search}
        onChange={(event): void => onSearch(event.target.value)}
        placeholder={locales.search}
        data-testid='diagram-search'
        startAdornment={
          <InputAdornment position='start'>
            <CustomIcon type='search' size='xs' />
          </InputAdornment>
        }
        endAdornment={
          search.length > 0 ? (
            <InputAdornment
              position='end'
              onClick={(): void => onSearch('')}
              sx={{ cursor: 'pointer' }}
              data-testid='diagram-search-clear'
            >
              <CustomIcon type='close' size='xs' />
            </InputAdornment>
          ) : undefined
        }
      />
      <Tooltip title={locales.diagram_auto_layout}>
        <IconButton size='small' onClick={onAutoLayout} data-testid='diagram-auto-layout'>
          <CustomIcon type='layout' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.diagram_fit}>
        <IconButton size='small' onClick={onFit} data-testid='diagram-fit'>
          <CustomIcon type='fit' />
        </IconButton>
      </Tooltip>
      <ToolbarSpacerStyled />
      <Tooltip title={locales.diagram_export}>
        <IconButton
          size='small'
          onClick={openExportMenu}
          data-testid='diagram-export'
          aria-controls={exportAnchor ? 'diagram-export-menu' : undefined}
          aria-haspopup='true'
          aria-expanded={exportAnchor ? 'true' : undefined}
        >
          <CustomIcon type='export' />
        </IconButton>
      </Tooltip>
      <Menu
        id='diagram-export-menu'
        anchorEl={exportAnchor}
        open={Boolean(exportAnchor)}
        onClose={closeExportMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          data-testid='diagram-export-png'
          onClick={(): void => {
            closeExportMenu();
            onExportPng();
          }}
        >
          {locales.diagram_export_png}
        </MenuItem>
        <MenuItem
          data-testid='diagram-export-svg'
          onClick={(): void => {
            closeExportMenu();
            onExportSvg();
          }}
        >
          {locales.diagram_export_svg}
        </MenuItem>
      </Menu>
    </DiagramToolbarStyled>
  );
}
