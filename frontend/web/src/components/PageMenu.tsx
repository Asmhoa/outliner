import React, { useState, useRef, useEffect } from 'react';

interface PageMenuProps {
  onDelete: () => void;
}

const PageMenu: React.FC<PageMenuProps> = ({ onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleDelete = () => {
    onDelete();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="page-menu" ref={menuRef}>
      <button onClick={handleToggleMenu} className="page-menu-button">
        ...
      </button>
      {isOpen && (
        <div className="page-menu-content">
          <ul>
            <li onClick={handleDelete}>Delete Page</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PageMenu;
