import { EventFor } from "@/src/core/@types";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import ResizableToggle from "./ResizableToggle";
import { ResizableBoxXProps } from "./types";

export default function ResizableXBox({
  direction,
  width,
  maxWidth,
  children,
}: ResizableBoxXProps) {
  const [boxWidth, setBoxWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);
  const [initialX, setInitialX] = useState(0);

  const handleMouseDown = (event: EventFor<"div", "onMouseDown">) => {
    event.preventDefault();
    setIsResizing(true);
    setInitialX(event.clientX);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  const handleMouseMove = (event: any) => {
    if (!isResizing) return;

    const newWidth =
      direction == "ltr"
        ? boxWidth - (event.clientX - initialX)
        : boxWidth + (event.clientX - initialX);

    setBoxWidth(
      Math.min(Math.max(newWidth, width ?? 50), maxWidth ?? width * 2),
    );
    setInitialX(event.clientX);
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <Box position={"relative"} overflow={"hidden"} width={boxWidth}>
      <ResizableToggle
        onMouseDown={() => handleMouseDown}
        direction={direction}
      />
      <div>{children}</div>
    </Box>
  );
}
