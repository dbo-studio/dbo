import { Components, Theme } from '@mui/material';
import Button from './Button';
import Input from './Input';
import Tabs from './Tabs';
import TreeView from './TreeView';
import CheckBox from './checkBox';
import Select from './select';

export default function ComponentsOverrides(theme: Theme): Components {
  return Object.assign(TreeView(theme), Input(theme), Tabs(theme), Select(theme), CheckBox(theme), Button(theme));
}
