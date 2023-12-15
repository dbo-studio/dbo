import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import ResizableToggle from "./ResizableToggle";
import { ResizableBoxYProps } from "./types";
import { EventFor } from "@/@types/event";

export default function ResizableYBox(props: ResizableBoxYProps) {
  const [boxHeight, setBoxHeight] = useState(props.height);
  const [isResizing, setIsResizing] = useState(false);
  const [initialY, setInitialY] = useState(0);

  const handleMouseDown = (event: EventFor<"div", "onMouseDown">) => {
    event.preventDefault();
    setIsResizing(true);
    setInitialY(event.clientY);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  const handleMouseMove = (event: any) => {
    if (!isResizing) return;

    const newHeight =
      props.direction == "ttb"
        ? boxHeight + (event.clientY - initialY)
        : boxHeight - (event.clientY - initialY);

    setBoxHeight(
      Math.min(
        Math.max(newHeight, props.height ?? 50),
        props.maxHeight ?? props.height * 2,
      ),
    );
    setInitialY(event.clientY);
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
    <Box
      position={"relative"}
      overflow={"hidden"}
      {...props}
      height={boxHeight}
    >
      <ResizableToggle
        onMouseDown={handleMouseDown}
        direction={props.direction}
      />
      {props.children}
    </Box>
  );
}
