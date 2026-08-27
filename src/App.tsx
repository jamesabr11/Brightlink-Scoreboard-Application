import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { FootballController } from "./components/dashboard/FootballController";
import { FootballScorebug } from "./components/scorebug/FootballScorebug";

function DashboardPage() {
  return (
    <div className="min-h-screen bg-neutral-950 p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl mb-6 flex justify-between items-center text-white">
        <h1 className="text-3xl font-bold">Production Dashboard</h1>
        <Link
          to="/broadcast"
          target="_blank"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 font-semibold"
        >
          Open Broadcast Monitor ↗
        </Link>
      </div>
      <FootballController />
    </div>
  );
}

function BroadcastPage() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-green-900 relative">
      {/* Green screen background to simulate broadcast video feed */}
      <FootballScorebug />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/broadcast" element={<BroadcastPage />} />
      </Routes>
    </Router>
  );
}
