import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Scoutline_Layout from "./feature/Scoutline/util/Scoutline.helpers";
import Scoutline_Feed from "./feature/Scoutline/Scoutline_Feed";

import { ThemeProvider } from "./context/ThemeContext";
import Scoutline_MonitoredPage from "./feature/Scoutline/Scoutline_MonitoredPage";
import Scoutline_AddPage from "./feature/Scoutline/Scoutline_AddPage";

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
              element={<Scoutline_AddPage onComplete={() => {}} />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
