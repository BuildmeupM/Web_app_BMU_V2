import { useRef, useCallback } from "react";

export function useTableResize() {
  const tableRef = useRef<HTMLTableElement>(null);
  const resizingCol = useRef<{
    idx: number;
    startX: number;
    startW: number;
  } | null>(null);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent, colIdx: number) => {
      e.preventDefault();
      const th = (e.target as HTMLElement).closest(
        "th",
      ) as HTMLTableCellElement;
      if (!th) return;
      resizingCol.current = {
        idx: colIdx,
        startX: e.clientX,
        startW: th.offsetWidth,
      };

      const onMove = (ev: MouseEvent) => {
        if (!resizingCol.current || !tableRef.current) return;
        const delta = ev.clientX - resizingCol.current.startX;
        const newW = Math.max(60, resizingCol.current.startW + delta);
        const ths = tableRef.current.querySelectorAll("thead th");
        const target = ths[resizingCol.current.idx] as HTMLElement;
        if (target) {
          target.style.width = `${newW}px`;
          target.style.minWidth = `${newW}px`;
        }
      };

      const onUp = () => {
        resizingCol.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [],
  );

  return { tableRef, onResizeMouseDown };
}
