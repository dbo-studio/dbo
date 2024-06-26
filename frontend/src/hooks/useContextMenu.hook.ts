import { useState } from 'react';

export const useContextMenu = () => {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    if (contextMenuPosition != null) {
      return;
    }

    setContextMenuPosition({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenuPosition(null);
  };

  return { contextMenuPosition, handleContextMenu, handleCloseContextMenu };
};
