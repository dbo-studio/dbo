import { Box } from "@mui/material";
import ConnectionItem from "./connection-item";

export default function Connections() {
  return (
    <Box>
      <ConnectionItem label="address-service" />
      <ConnectionItem label="order-service" selected={true} />
      <ConnectionItem label="user-service" />
      <ConnectionItem label="product-service" />
      <ConnectionItem label="price-service" />
    </Box>
  );
}
