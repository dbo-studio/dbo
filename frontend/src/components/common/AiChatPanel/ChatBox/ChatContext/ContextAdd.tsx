import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import DropDownMenu from '@/components/base/DropDownMenu/DropDownMenu';
import locales from '@/locales';
import { useCurrentConnection } from '@/hooks';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, IconButton, InputBase, Tooltip } from '@mui/material';
import { type JSX, useMemo, useRef, useState } from 'react';
import { useToggle } from 'usehooks-ts';
import type { ChatContextProps } from '../../types';
import {
  buildContextOptions,
  type ContextOption,
  tableGroupLabel,
  toggleContextOption
} from '../../utils/contextOptions';
import ContextPicker from '../ContextPicker/ContextPicker';

/** The + in the composer footer: attach tables, views and the like to the next message. */
export default function ContextAdd({ autocomplete }: ChatContextProps): JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [isOpen, toggleOpen, setOpen] = useToggle(false);

  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);

  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const tablesGroup = tableGroupLabel(useCurrentConnection()?.type);
  const options = useMemo(
    () => buildContextOptions(autocomplete, context, search, tablesGroup),
    [autocomplete, context, search, tablesGroup]
  );
  const active = Math.min(activeIndex, Math.max(options.length - 1, 0));

  const closePicker = () => {
    setOpen(false);
    setSearch('');
  };

  // The list stays open so several items can be attached in a row.
  const handlePick = (option: ContextOption) => updateContext(toggleContextOption(context, option));

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((active + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % Math.max(options.length, 1));
    } else if (e.key === 'Escape') {
      closePicker();
    } else if (e.key === 'Enter' && options[active]) {
      e.preventDefault();
      handlePick(options[active]);
    }
  };

  return (
    <>
      <Tooltip title={locales.ai_context_search} enterDelay={700}>
        <IconButton
          ref={anchorRef}
          onClick={toggleOpen}
          aria-label={locales.ai_context_search}
          data-testid='ai-context-add'
          sx={{ width: 28, height: 28, p: 0, flexShrink: 0, border: 1, borderColor: 'divider' }}
        >
          <CustomIcon type='plus' size='s' />
        </IconButton>
      </Tooltip>
      <DropDownMenu open={isOpen} onClose={closePicker} anchorRef={anchorRef}>
        <ContextPicker
          options={options}
          activeIndex={active}
          onPick={handlePick}
          onHover={setActiveIndex}
          header={
            <Box sx={{ p: 0.5, pb: 0 }}>
              <InputBase
                autoFocus
                fullWidth
                margin='none'
                placeholder={locales.ai_context_search}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                inputProps={{ 'data-testid': 'ai-context-search' }}
              />
            </Box>
          }
        />
      </DropDownMenu>
    </>
  );
}
