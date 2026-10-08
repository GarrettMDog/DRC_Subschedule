import { createContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// `short` is the label used on narrow (phone) screens so all tabs fit on one
// line — see the .nav-tab rules in styles.css.
const NAV_ITEMS = [
  { value: '/', label: 'Jobs' },
  { value: '/subcontractors', label: 'Subcontractors', short: 'Subs' },
  { value: '/services', label: 'Services' },
  { value: '/estimating', label: 'Estimating' },
  { value: '/calendar', label: 'Calendar' }
];

// Lets a page reach up and hide the shared nav bar too — used by the Jobs
// tab's own minimize toggle, so minimizing hides the nav tabs as well as
// its own toolbar. A page that hides the nav must restore it (setNavHidden
// back to false) on unmount, since nothing else will — leaving it hidden
// on some other page would remove the only way to navigate at all.
export const NavVisibilityContext = createContext({ setNavHidden: () => {} });

export default function OfficeLayout({ children }) {
  const location = useLocation();
  const headerRef = useRef(null);
  const [navHidden, setNavHidden] = useState(false);

  // Safety net on top of each page's own cleanup: whichever page is active,
  // switching routes always restores the nav bar. Getting stuck with it
  // hidden on some other page would mean no way to navigate at all, so this
  // doesn't rely solely on the page that hid it cleaning up correctly.
  useEffect(() => {
    setNavHidden(false);
  }, [location.pathname]);

  // The header's height isn't fixed — the nav row wraps to a second line
  // on narrow/mobile screens (see the comment below), so anything else
  // that needs to stick just below it (like the Jobs tab's per-date sticky
  // headers) can't safely assume a hardcoded pixel offset. Measuring the
  // real rendered height and exposing it as a CSS variable means it stays
  // correct regardless of screen width, font size, or nav wrapping.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const updateHeight = () => {
      document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <NavVisibilityContext.Provider value={{ setNavHidden }}>
      <div>
        <header
          ref={headerRef}
          style={{
            padding: '6px 16px',
            borderBottom: '1px solid var(--colorNeutralStroke2)',
            position: 'sticky',
            top: 0,
            background: 'var(--colorNeutralBackground1)',
            zIndex: 10
          }}
        >
          {/* Plain flex nav, not Fluent's TabList — TabList never wraps or
              scrolls on narrow containers. On phones the tabs share the row
              equally and shrink (short labels, smaller text) so they all fit
              on one line; see .office-nav in styles.css. */}
          {!navHidden && (
            <nav className="office-nav">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname === item.value;
                return (
                  <Link key={item.value} to={item.value} className={`nav-tab${active ? ' active' : ''}`}>
                    {item.short ? (
                      <>
                        <span className="nav-label-full">{item.label}</span>
                        <span className="nav-label-short">{item.short}</span>
                      </>
                    ) : (
                      item.label
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </header>
        <main style={{ padding: '16px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>{children}</div>
        </main>
      </div>
    </NavVisibilityContext.Provider>
  );
}
