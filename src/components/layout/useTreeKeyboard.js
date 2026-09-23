import { useCallback, useRef } from "react";

const useTreeKeyboard = (visibleCount) => {
  const focusedIndexRef = useRef(-1);
  const treeItemRefs = useRef([]);

  const setRef = useCallback((index) => (el) => {
    treeItemRefs.current[index] = el;
  }, []);

  const focusIndex = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, visibleCount - 1));
    focusedIndexRef.current = clamped;
    treeItemRefs.current[clamped]?.focus();
  }, [visibleCount]);

  const onKeyDown = useCallback(
    (event) => {
      const { key } = event;
      const current = focusedIndexRef.current;

      switch (key) {
        case "ArrowDown":
          event.preventDefault();
          focusIndex(current + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          focusIndex(current - 1);
          break;
        case "Home":
          event.preventDefault();
          focusIndex(0);
          break;
        case "End":
          event.preventDefault();
          focusIndex(visibleCount - 1);
          break;
        default:
          break;
      }
    },
    [focusIndex, visibleCount]
  );

  return { onKeyDown, setRef, focusedIndexRef };
};

export default useTreeKeyboard;
