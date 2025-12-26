import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import AppRoutes from "./AppRoutes";
import "./index.css";
import { DatabaseProvider } from "./contexts/DatabaseContext";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css"; // need for proper positioning

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider>
        <DatabaseProvider>
          <Notifications position="top-right" />
          <AppRoutes />
        </DatabaseProvider>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
);
