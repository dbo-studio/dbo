import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Badge, IconButton, Tooltip } from '@mui/material';

export default function BrowsePanelButton({
  kind,
  open,
  count,
  onClick
}: {
  kind: 'filter' | 'sort';
  open: boolean;
  count: number;
  onClick: () => void;
}) {
  const label = kind === 'filter' ? locales.filters : locales.sorts;
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        aria-expanded={open}
        className={open ? 'active' : ''}
        data-testid={`browse-panel-${kind}`}
        onClick={onClick}
      >
        <Badge badgeContent={count} color='secondary' variant='dot'>
          <CustomIcon type={kind} size='s' />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
