import { Routes, Route } from "react-router-dom";
import App from "./App";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/db/:dbName" element={<App />} />
      <Route path="/db/:dbName/pages/:pageId" element={<App />} />
    </Routes>
  );
}

export default AppRoutes;