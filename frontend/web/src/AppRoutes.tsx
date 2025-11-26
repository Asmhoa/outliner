import { Routes, Route } from "react-router-dom";
import App from "./App";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/db/:dbId" element={<App />} />
      <Route path="/db/:dbId/pages/:pageId" element={<App />} />
      <Route path="/db/:dbId/all-pages" element={<App />} />
    </Routes>
  );
}

export default AppRoutes;