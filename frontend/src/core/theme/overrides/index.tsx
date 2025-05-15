import type { Components, Theme } from '@mui/material';
import Baseline from './Baseline';
import Button from './Button';
import IconButton from './IconButton';
import Input from './Input';
import Menu from './Menu';
import Select from './Select';
import Table from './Table';
import Tabs from './Tabs';

export default function ComponentsOverrides(theme: Theme): Components {
  return Object.assign(
    Baseline(theme),
    Input(theme),
    Tabs(theme),
    Select(theme),
    Button(theme),
    IconButton(theme),
    Menu(theme),
    Table(theme)
  );
}
