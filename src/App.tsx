import { BrowserRouter, NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
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

// Pages with the code editor (CodeMirror) load separately. main.tsx loads the page's code before the
// app starts when one of them is the first page opened; then it renders at once (React.lazy would
// show a loading message for a moment, and the pre-rendered page would jump).
function editorPage(load: () => Promise<{ default: ComponentType }>) {
  let component: ComponentType | null = null;
  const preload = () =>
    load().then((m) => {
      component = m.default;
    });
  function Route() {
    const [, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (!component) preload().then(() => setLoaded(true), () => setFailed(true));
    }, []);
    const Page = component;
    if (Page) return <Page />;
    return failed ? (
      <p role="alert">
        This page couldn't be loaded. Check the connection and{" "}
        <button type="button" className="linkish" onClick={() => location.reload()}>
          reload the page
        </button>
        .
      </p>
    ) : (
      <p className="muted">Loading…</p>
    );
  }
  return { Route, preload };
}

const stepPage = editorPage(() => import("./pages/StepPage"));
const playgroundPage = editorPage(() => import("./pages/Playground"));
const deathmatchPage = editorPage(() => import("./pages/Deathmatch"));
const dailyPage = editorPage(() => import("./pages/Daily"));
const placementPage = editorPage(() => import("./pages/Placement"));
export const loadStepPage = stepPage.preload;
export const loadPlayground = playgroundPage.preload;
/** Practice pages, by their first address segment. */
export const loadPractice: Record<string, () => Promise<void>> = { deathmatch: deathmatchPage.preload, daily: dailyPage.preload, placement: placementPage.preload };

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
                <Link to="/learn/">All modules</Link>
              </li>
              <li>
                <Link to="/learn/printing/">Start with module 1</Link>
              </li>
              <li>
                <Link to="/playground/">Playground</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h2>Practice</h2>
            <ul>
              <li>
                <Link to="/deathmatch/">Deathmatch</Link>
              </li>
              <li>
                <Link to="/daily/">Daily challenge</Link>
              </li>
              <li>
                <Link to="/placement/">Placement quiz</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h2>Site</h2>
            <ul>
              <li>
                <Link to="/settings/">Settings</Link>
              </li>
              <li>
                <Link to="/about/">About and credits</Link>
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
  ["/learn/", "Learn"],
  ["/deathmatch/", "Deathmatch"],
  ["/daily/", "Daily"],
  ["/playground/", "Playground"],
  ["/settings/", "Settings"],
  ["/about/", "About"],
];

/** The header: the navigation on wide screens, a menu button on phones and tablets. */
function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const menuRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    // The menu comes before its button in the page, so move focus into it when it opens.
    navRef.current?.querySelector("a")?.focus();
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
    <header
      className="topbar"
      onBlur={(e) => {
        // Close the menu once keyboard focus leaves the header, so it never covers what has focus.
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Link to="/" className="brand" aria-label="Java Arena home">
        <BrandMark />
        <span className="brand-name">
          Java <b>Arena</b>
        </span>
      </Link>
      <nav id="main-nav" ref={navRef} className={open ? "nav nav-open" : "nav"} aria-label="Main">
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
        <Link to="/learn/" className="btn btn-primary btn-sm topbar-cta">
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:moduleId" element={<ModulePage />} />
          <Route path="/learn/:moduleId/:stepSlug" element={<stepPage.Route />} />
          <Route path="/playground" element={<playgroundPage.Route />} />
          <Route path="/deathmatch" element={<deathmatchPage.Route />} />
          <Route path="/daily" element={<dailyPage.Route />} />
          <Route path="/placement" element={<placementPage.Route />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Main>
      <Footer />
    </BrowserRouter>
  );
}
