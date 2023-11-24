import styled from "@emotion/styled";
import { Box, Theme, useTheme } from "@mui/material";
import ConnectionItem from "./ConnectionItem";

export default function Connections() {
  const theme: Theme = useTheme();

  const EmptySpaceStyle = styled("div")({
    width: "100%",
    flex: 1,
    borderRight: `1px solid ${theme.palette.divider}`,
  });

  return (
    <Box height={"100%"} display={"flex"} flexDirection={"column"}>
      <ConnectionItem label="address-service" />
      <ConnectionItem label="order-service" selected={true} />
      <ConnectionItem label="user-service" />
      <ConnectionItem label="product-service" />
      <ConnectionItem label="price-service" />
      <EmptySpaceStyle />
    </Box>
  );
}
