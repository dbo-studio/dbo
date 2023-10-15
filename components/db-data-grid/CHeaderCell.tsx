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
    <HeaderCell>
      <Button
        fullWidth
        style={{ justifyContent: "flex-start" }}
        endIcon={getIcon(sortKey)}
        onClick={() =>
          sort.fns.onToggleSort({
            sortKey: sortKey,
          })
        }
      >
        Task
      </Button>
    </HeaderCell>
  );
}
