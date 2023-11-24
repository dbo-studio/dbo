import { Theme } from "@mui/material";

export type ConnectionItemStylesProps = {
  theme: Theme;
  selected?: boolean;
};

export type ConnectionItemProps = {
  label: string;
  selected?: boolean;
};
