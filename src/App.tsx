import { Routes, Route } from "react-router";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Explore from "./pages/Explore";
import SearchPage from "./pages/SearchPage";
import Marketplace from "./pages/Marketplace";
import JobsPage from "./pages/JobsPage";
import Talent from "./pages/Talent";
import MessagesPage from "./pages/MessagesPage";
import Analytics from "./pages/Analytics";
import Wallet from "./pages/Wallet";
import Ranks from "./pages/Ranks";
import ProfilePage from "./pages/ProfilePage";
import StartupDetail from "./pages/StartupDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/talent" element={<Talent />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/ranks" element={<Ranks />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/startups/:id" element={<StartupDetail />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
