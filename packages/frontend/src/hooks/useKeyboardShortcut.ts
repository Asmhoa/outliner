import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  cmd?: boolean; // CMD key (Mac) or Ctrl key (Windows/Linux) - common shortcut pattern
}

const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  options: KeyboardShortcutOptions = {}
): void => {
  const { ctrl = false, shift = false, alt = false, meta = false, cmd = false } = options;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the required modifiers match
      // The cmd option should match either meta (Mac) or ctrl (Windows/Linux)
      const isCmdPressed = cmd ? (event.metaKey || event.ctrlKey) : (event.metaKey === meta && event.ctrlKey === ctrl);
      const isShiftPressed = event.shiftKey === shift;
      const isAltPressed = event.altKey === alt;

      if (
        isCmdPressed &&
        isShiftPressed &&
        isAltPressed &&
        event.key.toLowerCase() === key.toLowerCase()
      ) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, callback, ctrl, shift, alt, meta, cmd]); // This array always has the same length
};

export { useKeyboardShortcut };