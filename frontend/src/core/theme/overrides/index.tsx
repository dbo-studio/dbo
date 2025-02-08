import type { Components, Theme } from '@mui/material';
import Baseline from './Baseline';
import Button from './Button';
import IconButton from './IconButton';
import Input from './Input';
import Menu from './Menu';
import Select from './Select';
import Table from './Table';
import Tabs from './Tabs';
import TreeView from './TreeView';
import Fonts from './Fonts.tsx';

export default function ComponentsOverrides(theme: Theme): Components {
  return Object.assign(
    Fonts(theme),
    Baseline(theme),
    TreeView(theme),
    Input(theme),
    Tabs(theme),
    Select(theme),
    Button(theme),
    IconButton(theme),
    Menu(theme),
    Table(theme)
  );
}
