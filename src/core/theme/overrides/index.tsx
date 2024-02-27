import { Components, Theme } from '@mui/material';
import Baseline from './Baseline';
import Button from './Button';
import Input from './Input';
import Menu from './Menu';
import Select from './Select';
import Tabs from './Tabs';
import TreeView from './TreeView';

export default function ComponentsOverrides(theme: Theme): Components {
  return Object.assign(
    Baseline(),
    TreeView(theme),
    Input(theme),
    Tabs(theme),
    Select(theme),
    Button(theme),
    Menu(theme)
  );
}
