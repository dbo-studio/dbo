import { Components, Theme } from '@mui/material';
import Baseline from './Baseline';
import Button from './Button';
import Input from './Input';
import Menu from './Menu';
import Select from './Select';
import Table from './Table';
import Tabs from './Tabs';
import TreeView from './TreeView';
import Typography from './Typography';

export default function ComponentsOverrides(theme: Theme): Components {
  return Object.assign(
    Baseline(theme),
    Typography(theme),
    TreeView(theme),
    Input(theme),
    Tabs(theme),
    Select(theme),
    Button(theme),
    Menu(theme),
    Table(theme)
  );
}
