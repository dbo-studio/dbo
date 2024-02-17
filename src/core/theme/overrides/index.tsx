import { Components, Theme } from '@mui/material';
import Baseline from './Baseline';
import Button from './Button';
import CheckBox from './CheckBox';
import Input from './Input';
import Menu from './Menu';
import Select from './Select';
import Tabs from './Tabs';
import TreeView from './TreeView';

export default function ComponentsOverrides(theme: Theme): Components {
  return Object.assign(
    Baseline(theme),
    TreeView(theme),
    Input(theme),
    Tabs(theme),
    Select(theme),
    CheckBox(theme),
    Button(theme),
    Menu(theme)
  );
}
