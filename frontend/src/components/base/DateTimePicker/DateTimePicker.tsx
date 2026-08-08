import { ClickAwayListener, Popper, Typography } from '@mui/material';
import { useCallback, useMemo, useRef, useState, type JSX } from 'react';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { valueToEditorString } from '@/core/utils/dataValue';
import {
  DateTimeCellInput,
  DateTimeField,
  DateTimeFieldInput,
  DateTimeIconButton,
  DateTimePickerLabel,
  DateTimePickerLabelRow,
  DateTimePickerRoot,
  DayCell,
  DayGrid,
  PickerActionButton,
  PickerFooter,
  PickerHeader,
  PickerNavButton,
  PickerPaper,
  TimeRow,
  TimeSelect,
  TimeSep,
  WeekdayRow
} from './DateTimePicker.styled';
import {
  daysInMonth,
  extractOffsetSuffix,
  formatTemporalDraft,
  formatTemporalParts,
  isValidTemporalDraft,
  MONTH_LABELS,
  monthStartWeekday,
  nowTemporalParts,
  padSelect,
  parseTemporalDraft,
  range,
  type TemporalParts,
  WEEKDAY_LABELS
} from './temporalDraft';
import type { DateTimePickerProps } from './types';

export default function DateTimePicker({
  mode,
  value,
  onCommit,
  onCancelEdit,
  variant = 'field',
  label,
  typelabel,
  size = 'small',
  disabled,
  inputRef: inputRefProp,
  'data-testid': dataTestId
}: DateTimePickerProps): JSX.Element {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = inputRefProp ?? internalRef;
  const fieldRef = useRef<HTMLDivElement>(null);

  const initialDraft = formatTemporalDraft(value, mode);
  const [draft, setDraft] = useState(initialDraft);
  const [syncedValue, setSyncedValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<TemporalParts>(() => parseTemporalDraft(value, mode));
  const [viewYear, setViewYear] = useState(parts.year);
  const [viewMonth, setViewMonth] = useState(parts.month);
  const [offsetSuffix, setOffsetSuffix] = useState(() =>
    mode === 'date' ? '' : extractOffsetSuffix(valueToEditorString(value).replace('T', ' '))
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const committedDraftRef = useRef(initialDraft);

  if (value !== syncedValue && !open) {
    setSyncedValue(value);
    const nextDraft = formatTemporalDraft(value, mode);
    const nextParts = parseTemporalDraft(value, mode);
    setDraft(nextDraft);
    setParts(nextParts);
    setViewYear(nextParts.year);
    setViewMonth(nextParts.month);
    setOffsetSuffix(mode === 'date' ? '' : extractOffsetSuffix(valueToEditorString(value).replace('T', ' ')));
    setValidationError(null);
    committedDraftRef.current = nextDraft;
  }

  const showCalendar = mode === 'date' || mode === 'datetime';
  const showTime = mode === 'time' || mode === 'datetime';
  const iconType = mode === 'time' ? 'clock' : 'calendar';

  const finish = useCallback(
    (next: string, closeEdit: boolean): void => {
      if (!isValidTemporalDraft(next, mode)) {
        setValidationError(
          mode === 'date' ? 'Use YYYY-MM-DD' : mode === 'time' ? 'Use HH:MM:SS' : 'Use YYYY-MM-DD HH:MM:SS'
        );
        return;
      }
      setValidationError(null);
      setOpen(false);
      committedDraftRef.current = next;
      onCommit(next);
      if (closeEdit) {
        onCancelEdit?.();
      }
    },
    [mode, onCancelEdit, onCommit]
  );

  const syncDraftFromParts = useCallback(
    (next: TemporalParts): string => {
      const formatted = formatTemporalParts(next, mode, offsetSuffix);
      setParts(next);
      setDraft(formatted);
      return formatted;
    },
    [mode, offsetSuffix]
  );

  const commitAndClose = useCallback(
    (next: string): void => {
      finish(next, variant === 'cell');
    },
    [finish, variant]
  );

  const handleInputBlur = useCallback((): void => {
    if (open) {
      return;
    }
    finish(draft, variant === 'cell');
  }, [draft, finish, open, variant]);

  const openPicker = useCallback((): void => {
    if (disabled) {
      return;
    }
    const next = parseTemporalDraft(draft || value, mode);
    setParts(next);
    setViewYear(next.year);
    setViewMonth(next.month);
    setOpen(true);
    inputRef.current?.focus();
  }, [disabled, draft, inputRef, mode, value]);

  const shiftMonth = useCallback(
    (delta: number): void => {
      setViewMonth((month) => {
        const date = new Date(viewYear, month - 1 + delta, 1);
        setViewYear(date.getFullYear());
        return date.getMonth() + 1;
      });
    },
    [viewYear]
  );

  const calendarDays = useMemo(() => {
    const firstWeekday = monthStartWeekday(viewYear, viewMonth);
    const count = daysInMonth(viewYear, viewMonth);
    const prevCount = daysInMonth(viewYear, viewMonth === 1 ? 12 : viewMonth - 1);
    const cells: Array<{ day: number; month: number; year: number; outside: boolean }> = [];

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const month = viewMonth === 1 ? 12 : viewMonth - 1;
      const year = viewMonth === 1 ? viewYear - 1 : viewYear;
      cells.push({ day: prevCount - i, month, year, outside: true });
    }
    for (let day = 1; day <= count; day += 1) {
      cells.push({ day, month: viewMonth, year: viewYear, outside: false });
    }
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      const month = viewMonth === 12 ? 1 : viewMonth + 1;
      const year = viewMonth === 12 ? viewYear + 1 : viewYear;
      cells.push({ day: nextDay, month, year, outside: true });
      nextDay += 1;
    }
    return cells;
  }, [viewMonth, viewYear]);

  const today = nowTemporalParts();

  const handleDayClick = (year: number, month: number, day: number): void => {
    const next = { ...parts, year, month, day };
    const formatted = syncDraftFromParts(next);
    if (mode === 'date') {
      commitAndClose(formatted);
      return;
    }
    setViewYear(year);
    setViewMonth(month);
  };

  const handleTimeChange = (field: 'hours' | 'minutes' | 'seconds', raw: string): void => {
    syncDraftFromParts({ ...parts, [field]: Number(raw) });
  };

  const handleToday = (): void => {
    const next = nowTemporalParts();
    if (mode === 'date') {
      next.hours = 0;
      next.minutes = 0;
      next.seconds = 0;
    }
    const formatted = syncDraftFromParts(next);
    setViewYear(next.year);
    setViewMonth(next.month);
    if (mode === 'date') {
      commitAndClose(formatted);
    }
  };

  const placeholder = mode === 'date' ? 'YYYY-MM-DD' : mode === 'time' ? 'HH:MM:SS' : 'YYYY-MM-DD HH:MM:SS';

  const inputCommon = {
    value: draft,
    disabled,
    spellCheck: false as const,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement>): void => {
      setDraft(e.target.value);
      setParts(parseTemporalDraft(e.target.value, mode));
      setOffsetSuffix(mode === 'date' ? '' : extractOffsetSuffix(e.target.value.replace('T', ' ')));
      setValidationError(null);
    },
    onBlur: handleInputBlur,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setDraft(committedDraftRef.current);
        setParts(parseTemporalDraft(committedDraftRef.current, mode));
        setValidationError(null);
        if (variant === 'cell') {
          onCancelEdit?.();
        }
      }
    }
  };

  return (
    <DateTimePickerRoot variant={variant}>
      {variant === 'field' && (label || typelabel) && (
        <DateTimePickerLabelRow>
          {label && <DateTimePickerLabel variant='caption'>{label}</DateTimePickerLabel>}
          {typelabel && <DateTimePickerLabel variant='caption'>{typelabel}</DateTimePickerLabel>}
        </DateTimePickerLabelRow>
      )}

      <DateTimeField ref={fieldRef} variant={variant}>
        {variant === 'cell' ? (
          <DateTimeCellInput
            ref={inputRef}
            type='text'
            data-testid={dataTestId ?? 'grid-cell-datetime'}
            {...inputCommon}
          />
        ) : (
          <DateTimeFieldInput
            inputRef={inputRef}
            size={size}
            fullWidth
            data-testid={dataTestId ?? 'field-datetime'}
            {...inputCommon}
          />
        )}

        <DateTimeIconButton
          type='button'
          variant={variant}
          tabIndex={-1}
          disabled={disabled}
          aria-label={mode === 'time' ? 'Open time picker' : 'Open date picker'}
          aria-expanded={open}
          onMouseDown={(e): void => {
            e.preventDefault();
            if (open) {
              setOpen(false);
              return;
            }
            openPicker();
          }}
        >
          <CustomIcon type={iconType} size='xs' color='currentColor' />
        </DateTimeIconButton>

        <Popper
          open={open}
          anchorEl={fieldRef.current}
          placement='bottom-start'
          style={{ zIndex: 1400 }}
          modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
        >
          <ClickAwayListener
            onClickAway={(event): void => {
              if (fieldRef.current?.contains(event.target as Node)) {
                return;
              }
              finish(draft || formatTemporalParts(parts, mode, offsetSuffix), variant === 'cell');
            }}
          >
            <PickerPaper
              role='dialog'
              aria-label={mode === 'time' ? 'Time picker' : 'Date picker'}
              onMouseDown={(e): void => {
                const tag = (e.target as HTMLElement).tagName;
                if (tag === 'SELECT' || tag === 'OPTION') {
                  return;
                }
                e.preventDefault();
              }}
              data-testid='datetime-picker'
            >
              {showCalendar && (
                <>
                  <PickerHeader>
                    <PickerNavButton type='button' aria-label='Previous month' onClick={() => shiftMonth(-1)}>
                      <CustomIcon type='chevronLeft' size='xs' color='currentColor' />
                    </PickerNavButton>
                    <span>
                      {MONTH_LABELS[viewMonth - 1]} {viewYear}
                    </span>
                    <PickerNavButton type='button' aria-label='Next month' onClick={() => shiftMonth(1)}>
                      <CustomIcon type='chevronRight' size='xs' color='currentColor' />
                    </PickerNavButton>
                  </PickerHeader>
                  <WeekdayRow>
                    {WEEKDAY_LABELS.map((dayLabel) => (
                      <span key={dayLabel}>{dayLabel}</span>
                    ))}
                  </WeekdayRow>
                  <DayGrid>
                    {calendarDays.map((cell) => {
                      const selected =
                        !cell.outside &&
                        cell.year === parts.year &&
                        cell.month === parts.month &&
                        cell.day === parts.day;
                      const isToday = cell.year === today.year && cell.month === today.month && cell.day === today.day;
                      return (
                        <DayCell
                          key={`${cell.year}-${cell.month}-${cell.day}-${cell.outside ? 'o' : 'i'}`}
                          type='button'
                          selected={selected}
                          today={isToday}
                          outside={cell.outside}
                          onClick={() => handleDayClick(cell.year, cell.month, cell.day)}
                        >
                          {cell.day}
                        </DayCell>
                      );
                    })}
                  </DayGrid>
                </>
              )}

              {showTime && (
                <TimeRow>
                  <TimeSelect
                    aria-label='Hours'
                    value={padSelect(parts.hours)}
                    onChange={(e) => handleTimeChange('hours', e.target.value)}
                  >
                    {range(24).map((h) => (
                      <option key={h} value={padSelect(h)}>
                        {padSelect(h)}
                      </option>
                    ))}
                  </TimeSelect>
                  <TimeSep>:</TimeSep>
                  <TimeSelect
                    aria-label='Minutes'
                    value={padSelect(parts.minutes)}
                    onChange={(e) => handleTimeChange('minutes', e.target.value)}
                  >
                    {range(60).map((m) => (
                      <option key={m} value={padSelect(m)}>
                        {padSelect(m)}
                      </option>
                    ))}
                  </TimeSelect>
                  <TimeSep>:</TimeSep>
                  <TimeSelect
                    aria-label='Seconds'
                    value={padSelect(parts.seconds)}
                    onChange={(e) => handleTimeChange('seconds', e.target.value)}
                  >
                    {range(60).map((s) => (
                      <option key={s} value={padSelect(s)}>
                        {padSelect(s)}
                      </option>
                    ))}
                  </TimeSelect>
                </TimeRow>
              )}

              <PickerFooter>
                <PickerActionButton type='button' actionVariant='ghost' onClick={handleToday}>
                  {mode === 'time' ? 'Now' : 'Today'}
                </PickerActionButton>
                <PickerActionButton
                  type='button'
                  actionVariant='primary'
                  onClick={() => commitAndClose(draft || formatTemporalParts(parts, mode, offsetSuffix))}
                >
                  Apply
                </PickerActionButton>
              </PickerFooter>
            </PickerPaper>
          </ClickAwayListener>
        </Popper>
      </DateTimeField>
      {validationError && (
        <Typography variant='caption' color='error' sx={{ mt: 0.5 }}>
          {validationError}
        </Typography>
      )}
    </DateTimePickerRoot>
  );
}
