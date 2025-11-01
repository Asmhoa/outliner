import { createContext, useState, ReactNode, useEffect } from "react";
import { useParams } from "react-router-dom";

export const DatabaseContext = createContext<{
  dbName: string | null;
  setDbName: (dbName: string) => void;
}>({
  dbName: null,
  setDbName: () => {},
});

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const { dbName: dbNameParam } = useParams<{ dbName: string }>();
  const [dbName, setDbName] = useState<string | null>(null);

  useEffect(() => {
    if (dbNameParam && dbNameParam !== dbName) {
      setDbName(dbNameParam);
    }
  }, [dbNameParam, dbName]);

  return (
    <DatabaseContext.Provider value={{ dbName, setDbName }}>
      {children}
    </DatabaseContext.Provider>
  );
};
