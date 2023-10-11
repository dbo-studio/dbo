import { Components, Theme } from "@mui/material";
import Input from "./Input";
import Tabs from "./Tabs";
import TreeView from "./TreeView";

export default function ComponentsOverrides(theme: Theme): Components {
  return Object.assign(TreeView(theme), Input(theme), Tabs(theme));
}
