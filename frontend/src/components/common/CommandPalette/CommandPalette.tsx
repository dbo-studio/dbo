import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useCommandPaletteStore } from '@/store/commandPalette/commandPalette.store';
import { Modal, Typography } from '@mui/material';
import { type JSX, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  PaletteBoxStyled,
  PaletteFooterStyled,
  PaletteGroupStyled,
  PaletteInputStyled,
  PaletteItemStyled,
  PaletteListStyled,
  PaletteSearchStyled
} from './CommandPalette.styled';
import { useCommands } from './useCommands';

/** Search everything and run anything from one place. */
export default function CommandPalette(): JSX.Element | null {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);

  if (!open) return null;

  return (
    <Modal open onClose={() => setOpen(false)}>
      <PaletteBody onClose={() => setOpen(false)} />
    </Modal>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }): JSX.Element {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const commands = useCommands(query);
  const listRef = useRef<HTMLDivElement>(null);
  const index = Math.min(active, Math.max(0, commands.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const run = (i: number): void => {
    const command = commands[i];
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(Math.min(index + 1, commands.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(index);
    }
  };

  return (
    <PaletteBoxStyled data-testid='command-palette' onKeyDown={onKeyDown} tabIndex={-1}>
      <PaletteSearchStyled>
        <CustomIcon type='search' size='s' />
        <PaletteInputStyled
          autoFocus
          fullWidth
          value={query}
          placeholder={locales.command_palette_placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          inputProps={{ 'aria-label': locales.command_palette, 'data-testid': 'command-palette-input' }}
        />
      </PaletteSearchStyled>
      <PaletteListStyled ref={listRef} role='listbox'>
        {commands.length === 0 && (
          <Typography variant='body2' color='textSubdued' sx={{ p: 1.5 }}>
            {locales.command_palette_empty}
          </Typography>
        )}
        {commands.map((command, i) => (
          <div key={command.id}>
            {(i === 0 || commands[i - 1].group !== command.group) && (
              <PaletteGroupStyled>{command.group}</PaletteGroupStyled>
            )}
            <PaletteItemStyled
              role='option'
              aria-selected={i === index}
              data-active={i === index}
              active={i === index}
              onMouseMove={() => setActive(i)}
              onClick={() => run(i)}
            >
              <CustomIcon type={command.icon} size='s' />
              <Typography variant='inherit' color='inherit' noWrap sx={{ flex: '0 1 auto' }}>
                {command.label}
              </Typography>
              {command.hint && (
                <Typography variant='inherit' color='textSubdued' noWrap sx={{ fontSize: '0.92em' }}>
                  {command.hint}
                </Typography>
              )}
            </PaletteItemStyled>
          </div>
        ))}
      </PaletteListStyled>
      <PaletteFooterStyled>
        <span>
          <kbd>↑↓</kbd> {locales.command_palette_navigate}
        </span>
        <span>
          <kbd>↵</kbd> {locales.command_palette_run}
        </span>
        <span>
          <kbd>Esc</kbd> {locales.command_palette_close}
        </span>
      </PaletteFooterStyled>
    </PaletteBoxStyled>
  );
}
