import { BrowserRouter, NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { BrandMark } from "./components/Brand";
import { EngineBadge } from "./components/Engine";
import Home from "./pages/Home";
import Learn from "./pages/Learn";
import ModulePage from "./pages/ModulePage";
import Settings from "./pages/Settings";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import { patchSettings } from "./state/store";
import { useAppearance, useResolvedTheme } from "./lib/appearance";
import { MOOC_LICENSE_URL, MOOC_URL, REPO_URL } from "./lib/site";

// The lesson page carries the code editor, so it loads separately (main.tsx preloads it when a
// lesson is the first page opened, so the pre-rendered page doesn't flash).
export const loadStepPage = () => import("./pages/StepPage");
const StepPage = lazy(loadStepPage);

/** On navigation: scroll to the top and move keyboard and screen-reader focus to the new page. */
function RouteChange() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (first.current) {
      first.current = false;
      return;
    }
    const main = document.getElementById("main");
    const heading = main?.querySelector("h1");
    const target = heading instanceof HTMLElement ? heading : main;
    if (target && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

function ThemeToggle() {
  const theme = useResolvedTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="theme-toggle" onClick={() => patchSettings({ theme: next })} aria-label={`Switch to the ${next} theme`} title={`Switch to the ${next} theme`}>
      {theme === "dark" ? <Sun className="icon" aria-hidden="true" /> : <Moon className="icon" aria-hidden="true" />}
    </button>
  );
}

const ext = <span className="visually-hidden"> (opens in a new tab)</span>;

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand" aria-label="Java Arena home">
              <BrandMark />
              <span className="brand-name">
                Java <b>Arena</b>
              </span>
            </Link>
            <p>Learn Java with the real compiler, running in your browser. Free and non-commercial.</p>
          </div>
          <div className="footer-col">
            <h2>Learn</h2>
            <ul>
              <li>
                <Link to="/learn">All modules</Link>
              </li>
              <li>
                <Link to="/learn/printing">Start with module 1</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h2>Site</h2>
            <ul>
              <li>
                <Link to="/settings">Settings</Link>
              </li>
              <li>
                <Link to="/about">About and credits</Link>
              </li>
              <li>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  Source on GitHub{ext}
                </a>
              </li>
              <li>
                <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener noreferrer">
                  Report a problem{ext}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            The lessons follow the order and topics of{" "}
            <a href={MOOC_URL} target="_blank" rel="noopener noreferrer">
              Java Programming{ext}
            </a>{" "}
            by the University of Helsinki, licensed under{" "}
            <a href={MOOC_LICENSE_URL} target="_blank" rel="noopener noreferrer license">
              CC BY-NC-SA 4.0{ext}
            </a>
            . Java Arena's lessons are shared under the same license; the site's code is MIT licensed. Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle. Java is a registered trademark of Oracle and/or its affiliates.
          </p>
          <p>Your progress stays in this browser. No account, no ads, no tracking.</p>
        </div>
      </div>
    </footer>
  );
}

const NAV: [string, string][] = [
  ["/learn", "Learn"],
  ["/settings", "Settings"],
  ["/about", "About"],
];

/** The header: the navigation on wide screens, a menu button on phones and tablets. */
function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Java Arena home">
        <BrandMark />
        <span className="brand-name">
          Java <b>Arena</b>
        </span>
      </Link>
      <nav id="main-nav" className={open ? "nav nav-open" : "nav"} aria-label="Main">
        {NAV.map(([to, label]) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
        <div className="nav-theme">
          <span>Theme</span>
          <ThemeToggle />
        </div>
      </nav>
      <div className="topbar-right">
        <EngineBadge />
        <ThemeToggle />
        <Link to="/learn" className="btn btn-primary btn-sm topbar-cta">
          Start learning
        </Link>
        <button ref={menuRef} type="button" className="icon-btn menu-btn" aria-expanded={open} aria-controls="main-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
          {open ? <X className="icon" aria-hidden="true" /> : <Menu className="icon" aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

function Main({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <main className={pathname === "/" ? "main main-full" : "main"} id="main" tabIndex={-1}>
      {children}
    </main>
  );
}

export default function App() {
  useAppearance();
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <RouteChange />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <Main>
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:moduleId" element={<ModulePage />} />
            <Route path="/learn/:moduleId/:stepSlug" element={<StepPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Main>
      <Footer />
    </BrowserRouter>
  );
}
