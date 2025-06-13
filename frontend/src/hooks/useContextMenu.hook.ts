import { useCallback, useState } from 'react';

export const useContextMenu = (): {
  contextMenuPosition: { mouseX: number; mouseY: number } | null;
  handleContextMenu: (event: React.MouseEvent) => void;
  handleCloseContextMenu: () => void;
} => {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenuPosition(
        contextMenuPosition === null
          ? {
              mouseX: event.clientX + 2,
              mouseY: event.clientY - 6
            }
          : null
      );
    },
    [contextMenuPosition]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  return { contextMenuPosition, handleContextMenu, handleCloseContextMenu };
};
