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
    ":hover": {
      background: theme.palette.background.paper,
    },
  });

  return (
    <ConnectionItemStyles
      borderBottom={`1px solid ${theme.palette.divider}`}
      borderRight={selected ? "unset" : `1px solid ${theme.palette.divider}`}
      p={2}
      justifyContent={"center"}
      display={"flex"}
      alignItems={"center"}
      flexDirection={"column"}
    >
      <Box maxWidth={80} textAlign={"center"}>
        <Icon type="databaseOutline" size="l" />
        <Typography mt={1} variant="body1" noWrap>
          {label}
        </Typography>
      </Box>
    </ConnectionItemStyles>
  );
}
