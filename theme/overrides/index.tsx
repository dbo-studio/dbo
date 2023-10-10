import { Components, Theme } from "@mui/material";
import Backdrop from "./Backdrop";
import Button from "./Button";
import Card from "./Card";
import Icon from "./Icon";
import Input from "./Input";
import Paper from "./Paper";
import Table from "./Table";
import Tabs from "./Tabs";
import Tooltip from "./Tooltip";
import Typography from "./Typography";

export default function ComponentsOverrides(theme: Theme): Components {
  return Object.assign(
    Card(theme),
    Table(theme),
    Input(theme),
    Paper(theme),
    Button(theme),
    Tooltip(theme),
    Backdrop(theme),
    Typography(theme),
    Icon(theme),
    Tabs(theme),
  );
}
