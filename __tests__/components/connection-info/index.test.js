import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ConnectionBox from "./../../../components/connection-info/ConnectionBox";

it("should render a box with background color, height, border radius, display, and padding", () => {
  render(<ConnectionBox />);
  const h6Element = screen.getByRole("heading");
  expect(h6Element).toHaveTextContent(
    "PostgreSQL 15.1: public: orders: SQL Query",
  );
});
