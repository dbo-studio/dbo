import Search from "../../base/search/Search";
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
