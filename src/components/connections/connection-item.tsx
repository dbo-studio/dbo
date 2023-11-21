import styled from "@emotion/styled";
import { Box, Theme, Typography, useTheme } from "@mui/material";
import Icon from "../ui/icon";

type ConnectionItemProps = {
  label: string;
  selected?: boolean;
};

export default function ConnectionItem({
  label,
  selected = false,
}: ConnectionItemProps) {
  const theme: Theme = useTheme();

  const ConnectionItemStyles = styled(Box)({
    cursor: "pointer",
    position: "relative",
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderRight: selected ? "unset" : `1px solid ${theme.palette.divider}`,
    justifyContent: "center",
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    padding: theme.spacing(2),
    maxWidth: "98px",
    maxHeight: "82px",
    ":hover": {
      background: theme.palette.background.paper,
    },
  });

  return (
    <ConnectionItemStyles>
      <Box maxHeight={50} maxWidth={50} textAlign={"center"}>
        <Icon type="databaseOutline" size="l" />
        <Typography component={"p"} mt={1} variant="caption" noWrap>
          {label}
        </Typography>
      </Box>
    </ConnectionItemStyles>
  );
}
