import { type InputHTMLAttributes, type JSX, type MouseEvent, useEffect, useRef } from 'react';
import { GridCheckboxInput, GridCheckboxRoot } from './DataGrid.styled';

type GridCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** Visual + a11y state for SQL NULL (neither true nor false). */
  indeterminate?: boolean;
};

export default function GridCheckbox({
  className,
  style,
  onClick,
  indeterminate = false,
  ...inputProps
}: GridCheckboxProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const readOnly = Boolean(inputProps.readOnly);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const handleRootClick = (e: MouseEvent<HTMLElement>): void => {
    if (!readOnly) {
      e.stopPropagation();
    }
    onClick?.(e as MouseEvent<HTMLInputElement>);
  };

  return (
    <GridCheckboxRoot as={readOnly ? 'span' : 'label'} className={className} style={style} onClick={handleRootClick}>
      <GridCheckboxInput ref={inputRef} type='checkbox' {...inputProps} />
    </GridCheckboxRoot>
  );
}
