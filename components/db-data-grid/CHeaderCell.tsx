import { Button } from "@mui/material";
import { HeaderCell } from "@table-library/react-table-library";
import Icon from "../ui/icon/Index";

// TODO fix type
export default function CHeaderCell({ sort, sortKey }: any) {
  const getIcon = (sortKey: string) => {
    if (sort.state.sortKey === sortKey && sort.state.reverse) {
      return <Icon type="arrowDown" />;
    }

    if (sort.state.sortKey === sortKey && !sort.state.reverse) {
      return <Icon type="arrowUp" />;
    }

    return null;
  };

  return (
    <HeaderCell resize={{ minWidth: 50 }}>
      <Button
        size="small"
        style={{ justifyContent: "center" }}
        endIcon={getIcon(sortKey)}
        onClick={() => {
          sort.fns.onToggleSort({
            sortKey: sortKey,
          });
        }}
      >
        {sortKey}
      </Button>
    </HeaderCell>
  );
}
