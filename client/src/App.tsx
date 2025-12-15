import { Routes, Route, Navigate } from "react-router-dom";
import { MainPage } from "./pages/MainPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AccountPage } from "./pages/AccountPage";

function App() {
  return (
    <Routes>
      <Route path="/app/dashboard" element={<MainPage view="dashboard" />} />
      <Route path="/app/audit-logs" element={<MainPage view="audit-log" />} />
      <Route path="/app/uploads" element={<MainPage view="uploads" />} />
      <Route path="/app/settings" element={<SettingsPage />} />
      <Route path="/app/account" element={<AccountPage />} />
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}

export default App;
