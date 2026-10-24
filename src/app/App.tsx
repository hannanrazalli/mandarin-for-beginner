import { useRegisterSW } from "virtual:pwa-register/react";
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Home as HomeIcon,
  Layers,
  Leaf,
  Settings as SettingsIcon,
} from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import {
  Component,
  type ErrorInfo,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";
import { copy } from "../lib/copy";
import { useSettings } from "../lib/settings";
import OfflineStatus from "../offline/Status";

const Home = lazy(() => import("../features/Home"));
const LessonPlayer = lazy(() => import("../learning/LessonPlayer"));
const Learn = lazy(() => import("../features/Learn"));
const Reviews = lazy(() => import("../reviews/Reviews"));
const Statistics = lazy(() => import("../analytics/AnalyticsPage"));
const Exercises = lazy(() => import("../reviews/Exercises"));
const TestOut = lazy(() => import("../reviews/TestOut"));
const Settings = lazy(() => import("../features/Settings"));
const Account = lazy(() => import("../auth/Account"));
const Preview = lazy(() => import("../features/Preview"));
class ErrorBoundary extends Component<
  { children: ReactNode; message: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    return this.state.failed ? (
      <div className="notice" role="alert">
        <p>{this.props.message}</p>
        <a href="/">BelajarMandarin</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
function PwaUpdate() {
  const t = copy(useSettings().language);
  const {
    needRefresh: [refresh, setRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => {} });
  return refresh ? (
    <aside className="update-banner" aria-label={t.update}>
      <p>{t.update}</p>
      <button
        type="button"
        className="button primary"
        onClick={() => void updateServiceWorker(true)}
      >
        {t.reload}
      </button>
      <button
        type="button"
        className="button secondary"
        onClick={() => setRefresh(false)}
      >
        {t.later}
      </button>
    </aside>
  ) : null;
}
export default function App() {
  const settings = useSettings();
  const t = copy(settings.language);
  const location = useLocation();
  const [routeReady, setRouteReady] = useState(0);
  const links = useMemo(
    () => [
      { to: "/", label: t.home, icon: HomeIcon },
      { to: "/belajar", label: t.learn, icon: BookOpen },
      { to: "/ulang-kaji", label: t.review, icon: Layers },
      { to: "/statistik", label: t.stats, icon: ChartNoAxesColumnIncreasing },
      { to: "/tetapan", label: t.settings, icon: SettingsIcon },
    ],
    [t],
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : settings.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme]);
  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.title = `${links.find((x) => x.to === location.pathname)?.label ?? (location.pathname === "/akaun" ? t.account : t.preview)} · BelajarMandarin`;
  }, [settings.language, location.pathname, t.preview, t.account, links]);
  useEffect(() => {
    if (location.pathname) {
      setRouteReady((x) => x + 1);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }
  }, [location.pathname]);
  useEffect(() => {
    if (routeReady) {
      const observer = new MutationObserver(() => {
        const h = document.querySelector<HTMLElement>("main h1");
        if (h) {
          h.focus();
          observer.disconnect();
        }
      });
      const h = document.querySelector<HTMLElement>("main h1");
      if (h) h.focus();
      else
        observer.observe(document.getElementById("main") ?? document.body, {
          childList: true,
          subtree: true,
        });
      return () => observer.disconnect();
    }
  }, [routeReady]);
  return (
    <AuthProvider>
      <MotionConfig reducedMotion="user">
        <a className="skip-link" href="#main">
          {t.skip}
        </a>
        <aside className="sidebar">
          <Link to="/" className="brand">
            <span className="brand-icon">
              <Leaf size={25} />
            </span>
            <span>
              Belajar<span className="brand-second">Mandarin</span>
            </span>
          </Link>
          <span className="preview-tag">
            {t.preview} / {settings.language === "ms" ? "FASA 1" : "PHASE 1"}
          </span>
          <nav
            aria-label={
              settings.language === "ms" ? "Navigasi utama" : "Main navigation"
            }
          >
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                <Icon size={21} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className="mini-sprout">✳</span>
            <p>{t.smallBody}</p>
            <span className="version">TAMAN BUNYI · 01</span>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <Link to="/" className="mobile-brand">
              <Leaf size={22} />
              BelajarMandarin
            </Link>
            <span className="desktop-kicker">
              TAMAN BUNYI <span>/</span>{" "}
              {
                t[
                  location.pathname === "/akaun"
                    ? "account"
                    : location.pathname === "/tetapan"
                      ? "settings"
                      : location.pathname === "/belajar"
                        ? "learn"
                        : location.pathname === "/ulang-kaji"
                          ? "review"
                          : location.pathname === "/statistik"
                            ? "stats"
                            : location.pathname === "/unit-0"
                              ? "preview"
                              : "home"
                ]
              }
            </span>
            <span className="top-preview">
              <span className="dot" />
              {t.preview}
            </span>
            <Link className="mobile-stats" to="/statistik" aria-label={t.stats}>
              <ChartNoAxesColumnIncreasing size={18} />
              {t.stats}
            </Link>
          </header>
          <main id="main" tabIndex={-1}>
            <OfflineStatus />
            <ErrorBoundary message={t.error}>
              <Suspense
                fallback={
                  <p className="loading" aria-busy="true">
                    {t.loading}
                  </p>
                }
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.16 }}
                >
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/belajar" element={<Learn />} />
                    <Route path="/belajar/:slug" element={<LessonPlayer />} />
                    <Route path="/ulang-kaji" element={<Reviews />} />
                    <Route path="/statistik" element={<Statistics />} />
                    <Route path="/latihan" element={<Exercises />} />
                    <Route path="/uji-unit-1" element={<TestOut />} />
                    <Route path="/tetapan" element={<Settings />} />
                    <Route path="/unit-0" element={<Preview />} />
                    <Route path="/akaun" element={<Account />} />
                    <Route
                      path="*"
                      element={
                        <>
                          <h1 tabIndex={-1}>{t.notFound}</h1>
                          <Link className="button primary" to="/">
                            {t.return}
                          </Link>
                        </>
                      }
                    />
                  </Routes>
                </motion.div>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
        <nav
          className="bottomnav"
          aria-label={
            settings.language === "ms"
              ? "Navigasi mudah alih"
              : "Mobile navigation"
          }
        >
          {links
            .filter((x) => x.to !== "/statistik")
            .map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                <Icon size={21} />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
        <PwaUpdate />
      </MotionConfig>
    </AuthProvider>
  );
}
