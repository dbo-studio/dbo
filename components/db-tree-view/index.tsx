import Search from "./Search";
import TablesTreeView from "./TablesTreeView.1";

type Props = {};

export default function DBTreeView({}: Props) {
  return (
    <>
      <Search />
      <TablesTreeView />
    </>
  );
}
