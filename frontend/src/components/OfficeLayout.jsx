import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { value: '/', label: 'Jobs' },
  { value: '/calendar', label: 'Calendar' },
  { value: '/subcontractors', label: 'Subcontractors' },
  { value: '/services', label: 'Services' }
];

// Scrolled past this many pixels before the title/tagline collapse away —
// a small buffer, not zero, so trackpad/momentum bounce right at the very
// top doesn't flicker the header in and out.
const COLLAPSE_THRESHOLD = 20;

export default function OfficeLayout({ children }) {
  const location = useLocation();
  const headerRef = useRef(null);

  // Title and tagline collapse away once scrolled down at all, reclaiming
  // space for whatever page is being browsed — the nav row itself always
  // stays visible regardless, so switching tabs is never blocked. Only
  // scrolling all the way back to the top brings the full header back,
  // rather than reappearing on every small upward scroll — the point is
  // to stay out of the way while actively browsing a long list, not pop
  // open and closed repeatedly.
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let ticking = false;
    function updateCollapsed() {
      setIsCollapsed(window.scrollY > COLLAPSE_THRESHOLD);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateCollapsed);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The header's height isn't fixed — the nav row wraps to a second line
  // on narrow/mobile screens (see the comment below), so anything else
  // that needs to stick just below it (like the Jobs tab's per-date sticky
  // headers) can't safely assume a hardcoded pixel offset. Measuring the
  // real rendered height and exposing it as a CSS variable means it stays
  // correct regardless of screen width, font size, nav wrapping, or now
  // the collapsed/expanded state too — nothing downstream needs to know
  // this collapsing exists at all, since they only ever read the
  // measured result.
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
    <div>
      <header
        ref={headerRef}
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--colorNeutralStroke2)',
          position: 'sticky',
          top: 0,
          background: 'var(--colorNeutralBackground1)',
          zIndex: 10
        }}
      >
        <div
          style={{
            maxHeight: isCollapsed ? 0 : 80,
            opacity: isCollapsed ? 0 : 1,
            overflow: 'hidden',
            transition: 'max-height 0.2s ease, opacity 0.15s ease'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>CreOps</div>
          <div className="header-tagline">Curing your workload</div>
        </div>
        {/* Plain flex-wrap nav, not Fluent's TabList — TabList is documented to never
            wrap or scroll on narrow containers (Fluent's own usage guidance), so on a
            phone-width screen with 3 labels including "Subcontractors" it would just
            run off the edge instead of dropping to a second line. */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.value;
            return (
              <Link key={item.value} to={item.value} style={{ textDecoration: 'none' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '10px 14px',
                    borderRadius: 'var(--borderRadiusMedium, 4px)',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--colorBrandForeground1)' : 'var(--colorNeutralForeground2)',
                    background: active ? 'var(--colorBrandBackground2)' : 'transparent'
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </header>
      <main style={{ padding: '16px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>{children}</div>
      </main>
    </div>
  );
}
