/** Material Design checkbox paths (same as MUI CheckBox / CheckBoxOutlineBlank / IndeterminateCheckBox). */
const MUI_UNCHECKED_PATH = 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z';

const MUI_CHECKED_PATH =
  'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';

const MUI_INDETERMINATE_PATH =
  'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z';

function checkboxSvgUrl(path: string, fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${fill}" d="${path}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Unchecked MUI-style checkbox icon as a CSS background-image. */
export function muiUncheckedCheckboxUrl(color: string): string {
  return checkboxSvgUrl(MUI_UNCHECKED_PATH, color);
}

/** Checked MUI-style checkbox icon as a CSS background-image. */
export function muiCheckedCheckboxUrl(color: string): string {
  return checkboxSvgUrl(MUI_CHECKED_PATH, color);
}

/** Indeterminate (NULL) MUI-style checkbox icon as a CSS background-image. */
export function muiIndeterminateCheckboxUrl(color: string): string {
  return checkboxSvgUrl(MUI_INDETERMINATE_PATH, color);
}

/** Icon size close to MUI Checkbox `size="small"`, fitted to 22px grid rows. */
export const checkboxBoxSize = 16;
