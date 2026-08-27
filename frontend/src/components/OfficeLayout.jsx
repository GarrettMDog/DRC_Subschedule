import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { value: '/', label: 'Dashboard' },
  { value: '/subcontractors', label: 'Subcontractors' },
  { value: '/jobs', label: 'Jobs' },
  { value: '/services', label: 'Services' }
];

export default function OfficeLayout({ children }) {
  const location = useLocation();

  return (
    <div>
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--colorNeutralStroke2)',
          position: 'sticky',
          top: 0,
          background: 'var(--colorNeutralBackground1)',
          zIndex: 10
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>SubSchedule</div>
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
      <main style={{ padding: '16px 24px' }}>{children}</main>
    </div>
  );
}
