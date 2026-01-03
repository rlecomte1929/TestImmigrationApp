import { useState, useEffect, useCallback } from "react";

interface SelectionPosition {
  x: number;
  y: number;
}

export const useTextSelection = (containerRef: React.RefObject<HTMLElement>) => {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<SelectionPosition | null>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";

    if (text && containerRef.current?.contains(selection?.anchorNode || null)) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      if (rect) {
        setSelectedText(text);
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
      }
    } else {
      setSelectedText("");
      setPosition(null);
    }
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectedText("");
    setPosition(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selectedText, position, clearSelection };
};
