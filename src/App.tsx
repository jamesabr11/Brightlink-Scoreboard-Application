import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { OperatorView } from "./components/basketball/OperatorView";
import { DisplayView } from "./components/basketball/DisplayView";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OperatorView />} />
        <Route path="/display" element={<DisplayView />} />
      </Routes>
    </Router>
  );
}
