import type { PropsWithChildren } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation
} from "react-router-dom";

import { PortalProvider, usePortalAuth } from "@/state/PortalStore";
import { NotificationsBell } from "@/components/NotificationsBell";
import { initials } from "@/lib/format";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MembersPage } from "@/pages/MembersPage";
import { MembershipsPage } from "@/pages/MembershipsPage";
import { CheckInsPage } from "@/pages/CheckInsPage";
import { ClassesPage } from "@/pages/ClassesPage";
import { ProgramsPage } from "@/pages/ProgramsPage";
import { ChallengesPage } from "@/pages/ChallengesPage";
import { AnnouncementsPage } from "@/pages/AnnouncementsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { StaffPage } from "@/pages/StaffPage";

interface NavEntry {
  to: string;
  icon: string;
  label: string;
  sub: string;
}

const NAV_SECTIONS: Array<{ title: string; items: NavEntry[] }> = [
  {
    title: "Operations",
    items: [
      { to: "/", icon: "▦", label: "Dashboard", sub: "Today at Iron District" },
      { to: "/members", icon: "◉", label: "Members", sub: "Profiles, plans and status" },
      { to: "/memberships", icon: "▤", label: "Memberships", sub: "Plans and renewals" },
      { to: "/checkins", icon: "◈", label: "Check-ins", sub: "Attendance and gate feed" }
    ]
  },
  {
    title: "Engagement",
    items: [
      { to: "/classes", icon: "▷", label: "Classes", sub: "Weekly schedule" },
      { to: "/programs", icon: "≡", label: "Programs", sub: "Templates and assignments" },
      { to: "/challenges", icon: "★", label: "Challenges", sub: "Competitions and leaderboard" },
      { to: "/announcements", icon: "◇", label: "Announcements", sub: "Member communications" }
    ]
  },
  {
    title: "Insights",
    items: [{ to: "/analytics", icon: "∿", label: "Analytics", sub: "Retention and revenue" }]
  },
  {
    title: "Admin",
    items: [{ to: "/staff", icon: "⚙", label: "Staff", sub: "Accounts and roles" }]
  }
];

const ALL_NAV = NAV_SECTIONS.flatMap((section) => section.items);

export function App() {
  return (
    <BrowserRouter>
      <PortalProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/memberships" element={<MembershipsPage />} />
            <Route path="/checkins" element={<CheckInsPage />} />
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </PortalProvider>
    </BrowserRouter>
  );
}

function RequireAuth({ children }: PropsWithChildren) {
  const { status } = usePortalAuth();
  if (status === "checking") {
    return (
      <div className="login-shell">
        <div className="muted" style={{ fontWeight: 700 }}>
          Checking your session…
        </div>
      </div>
    );
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function Layout() {
  const { staff, logout } = usePortalAuth();
  const location = useLocation();
  const current = ALL_NAV.find((item) => item.to === location.pathname) ?? ALL_NAV[0];

  return (
    <div className="layout">
      <nav className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark" aria-hidden>
            🐀
          </div>
          <div>
            <div className="sidebar-brand-name">RatLevel</div>
            <div className="sidebar-brand-sub">Gym Portal · Iron District</div>
          </div>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="sidebar-section">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="avatar" aria-hidden>
            {staff ? initials(staff.name) : "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{staff?.name}</div>
            <div className="muted" style={{ fontSize: 11, textTransform: "capitalize" }}>
              {staff?.role}
            </div>
          </div>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{current.label}</div>
            <div className="topbar-sub">{current.sub}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NotificationsBell />
            <button type="button" className="btn small" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
