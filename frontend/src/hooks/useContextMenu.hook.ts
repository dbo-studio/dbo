import type React from 'react';
import { useState } from 'react';

export const useContextMenu = (): {
  contextMenuPosition: { mouseX: number; mouseY: number } | null;
  handleContextMenu: (event: React.MouseEvent) => void;
  handleCloseContextMenu: () => void;
} => {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);

  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
    if (contextMenuPosition != null) {
      return;
    }

    setContextMenuPosition({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6
    });
  };

  const handleCloseContextMenu = (): void => {
    setContextMenuPosition(null);
  };

  return { contextMenuPosition, handleContextMenu, handleCloseContextMenu };
};
