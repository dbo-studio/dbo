import { useState } from 'react';

function useContextMenu() {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenuPosition(null);
  };

  return { contextMenuPosition, handleContextMenu, handleCloseContextMenu };
}

export default useContextMenu;
