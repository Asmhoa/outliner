import { createContext, useState, ReactNode, useEffect } from "react";
import { useParams } from "react-router-dom";

export const DatabaseContext = createContext<{
  dbId: string | null;
  setDbId: (dbId: string) => void;
}>({
  dbId: null,
  setDbId: () => {},
});

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const { dbId: dbIdParam } = useParams<{ dbId: string }>();
  const [dbId, setDbId] = useState<string | null>(null);

  useEffect(() => {
    if (dbIdParam && dbIdParam !== dbId) {
      setDbId(dbIdParam);
    }
  }, [dbIdParam, dbId]);

  return (
    <DatabaseContext.Provider value={{ dbId, setDbId }}>
      {children}
    </DatabaseContext.Provider>
  );
};
