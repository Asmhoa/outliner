import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  options: KeyboardShortcutOptions = {}
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrl = false, cmd = false, shift = false, alt = false } = options;
      
      // Check for command key (Mac) or control key (Windows/Linux)
      const isMetaPressed = event.metaKey;  // Mac CMD key
      const isCtrlPressed = event.ctrlKey;  // Windows/Linux Ctrl key
      const isShiftPressed = event.shiftKey;
      const isAltPressed = event.altKey;

      // Check if the required modifiers match
      const cmdMatch = cmd ? (isMetaPressed || isCtrlPressed) : !(isMetaPressed || isCtrlPressed); // CMD covers both meta and ctrl for cross-platform
      const ctrlMatch = ctrl ? isCtrlPressed : !isCtrlPressed;
      const shiftMatch = shift ? isShiftPressed : !isShiftPressed;
      const altMatch = alt ? isAltPressed : !isAltPressed;

      // Only execute if all modifier conditions are met and the correct key is pressed
      if (
        cmdMatch &&
        ctrlMatch &&
        shiftMatch &&
        altMatch &&
        event.key.toLowerCase() === key.toLowerCase()
      ) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, callback, options]);
};