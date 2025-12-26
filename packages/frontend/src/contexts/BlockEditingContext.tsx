import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BlockEditingContextType {
  editingBlockId: string | null;
  setEditingBlock: (blockId: string | null) => void;
}

const BlockEditingContext = createContext<BlockEditingContextType | undefined>(undefined);

interface BlockEditingProviderProps {
  children: ReactNode;
}

export const BlockEditingProvider: React.FC<BlockEditingProviderProps> = ({ children }) => {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const setEditingBlock = (blockId: string | null) => {
    setEditingBlockId(blockId);
  };

  return (
    <BlockEditingContext.Provider value={{ editingBlockId, setEditingBlock }}>
      {children}
    </BlockEditingContext.Provider>
  );
};

export const useBlockEditing = (): BlockEditingContextType => {
  const context = useContext(BlockEditingContext);
  if (context === undefined) {
    throw new Error('useBlockEditing must be used within a BlockEditingProvider');
  }
  return context;
};