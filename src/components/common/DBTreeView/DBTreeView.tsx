import Search from "../../base/Search/Search";
import TablesTreeView from "./TablesTreeView";

type Props = {};

export default function DBTreeView({}: Props) {
  return (
    <>
      <Search />
      <TablesTreeView />
    </>
  );
}
