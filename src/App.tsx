import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigsPage } from "./components/basketball/ConfigsPage";
import { DisplayView } from "./components/basketball/DisplayView";
import { HistoryPage } from "./components/basketball/HistoryPage";
import { MediaPage } from "./components/basketball/MediaPage";
import { OperatorLayout } from "./components/basketball/OperatorLayout";
import { OperatorView } from "./components/basketball/OperatorView";
import { SettingsPage } from "./components/basketball/SettingsPage";
import { SetupPage } from "./components/basketball/SetupPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<OperatorLayout />}>
          <Route path="/" element={<OperatorView />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/configs" element={<ConfigsPage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/display" element={<DisplayView />} />
      </Routes>
    </Router>
  );
}
