import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Scoutline_Layout from "./components/feature/Scoutline/util/Scoutline.helpers";
import Scoutline_Feed from "./components/feature/Scoutline/Scoutline_Feed";

import PlaceholderPage1 from "./components/feature/Scoutline/PlaceholderPage copy";
import { ThemeProvider } from "./context/ThemeContext";
import Scoutline_MonitoredPage from "./components/feature/Scoutline/Scoutline_MonitoredPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* The Layout wraps all child routes */}
          <Route path="/" element={<Scoutline_Layout />}>
            <Route index element={<Navigate to="/feed" replace />} />

            <Route path="feed" element={<Scoutline_Feed />} />
            <Route path="monitored" element={<Scoutline_MonitoredPage />} />
            <Route
              path="addPage"
              element={<PlaceholderPage1 title="Add Page" />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
