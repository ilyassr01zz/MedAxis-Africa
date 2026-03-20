import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'

// ── Sidebar nav links per role ────────────────────────────────────────────
const SIDEBAR_LINKS = {
  DOCTOR: [
    { to: '/doctor', label: 'Dashboard',        icon: 'dashboard'      },
    { to: '/doctor', label: 'Prescriptions',    icon: 'description'    },
    { to: '/doctor', label: 'Patient Lookup',   icon: 'person_search'  },
    { to: '/doctor', label: 'Pharmacy Portal',  icon: 'medication'     },
    { to: '/doctor', label: 'Regulatory Stats', icon: 'bar_chart'      },
    { to: '/doctor', label: 'System Logs',      icon: 'history'        },
  ],
  PHARMACIST: [
    { to: '/pharmacy', label: 'Dashboard',        icon: 'dashboard'      },
    { to: '/pharmacy', label: 'Prescriptions',    icon: 'description'    },
    { to: '/pharmacy', label: 'Patient Lookup',   icon: 'person_search'  },
    { to: '/pharmacy', label: 'Pharmacy Portal',  icon: 'medication'     },
    { to: '/pharmacy', label: 'Regulatory Stats', icon: 'bar_chart'      },
    { to: '/pharmacy', label: 'System Logs',      icon: 'history'        },
  ],
  PATIENT: [],
  REGULATOR: [
    { to: '/regulator', label: 'Dashboard',        icon: 'dashboard'      },
    { to: '/regulator', label: 'Prescriptions',    icon: 'description'    },
    { to: '/regulator', label: 'Patient Lookup',   icon: 'person_search'  },
    { to: '/regulator', label: 'Pharmacy Portal',  icon: 'medication'     },
    { to: '/regulator', label: 'Regulatory Stats', icon: 'bar_chart'      },
    { to: '/regulator', label: 'System Logs',      icon: 'history'        },
  ],
}

// ── Layout ────────────────────────────────────────────────────────────────
export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = SIDEBAR_LINKS[user?.role] || []
  const hasSidebar = user?.role !== 'PATIENT'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Patient layout: no sidebar, just top bar + centered content
  if (!hasSidebar) {
    return (
      <div className="min-h-screen bg-surface">
        <TopAppBar user={user} onLogout={handleLogout} fixed={false} />
        <main className="max-w-4xl mx-auto px-8 pt-6 pb-16">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Fixed sidebar */}
      <Sidebar links={links} user={user} onLogout={handleLogout} />

      {/* Fixed top app bar — offset by sidebar width */}
      <TopAppBar user={user} onLogout={handleLogout} fixed />

      {/* Main content area — clear fixed sidebar (w-64) and top bar (h-16) */}
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ── Fixed sidebar ─────────────────────────────────────────────────────────
function Sidebar({ links, onLogout }) {
  return (
    <aside
      className="fixed inset-y-0 left-0 w-64 flex flex-col z-30"
      style={{ backgroundColor: '#f2f4f4', borderRight: '1px solid #bdc9c8' }}
    >
      {/* Brand block */}
      <div
        className="h-16 px-4 flex items-center gap-3 shrink-0"
        style={{ borderBottom: '1px solid #bdc9c8' }}
      >
        <div className="w-8 h-8 flex items-center justify-center rounded-sm" style={{ backgroundColor: '#0d7c7c' }}>
          <span className="material-symbols-outlined text-white text-[18px]">health_and_safety</span>
        </div>
        <div className="leading-tight">
          <div className="brand-font text-sm font-bold" style={{ color: '#191c1d' }}>MedAxis Admin</div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: '#3e4948' }}>Infrastructure Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
        {links.map((link) => (
          <SidebarLink key={link.label} to={link.to} label={link.label} icon={link.icon} />
        ))}
      </nav>

      {/* Bottom CTAs */}
      <div className="px-3 pb-4 pt-2 space-y-1" style={{ borderTop: '1px solid #bdc9c8' }}>
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-on-primary rounded-sm transition-opacity hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: '#006161' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Prescription
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-surface-container transition-colors cursor-pointer" style={{ color: '#3e4948' }}>
          <span className="material-symbols-outlined text-[18px]">help_outline</span>
          Help Center
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-surface-container transition-colors cursor-pointer"
          style={{ color: '#3e4948' }}
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Logout
        </button>
      </div>
    </aside>
  )
}

// ── Top app bar ───────────────────────────────────────────────────────────
function TopAppBar({ user, onLogout, fixed = false }) {
  return (
    <header
      className={`${fixed ? 'fixed top-0 left-64 right-0 z-20' : 'sticky top-0 z-20'} h-16 flex items-center justify-between px-6 bg-surface-container-lowest`}
      style={{ borderBottom: '1px solid #bdc9c8' }}
    >
      {/* Left: brand (only shown in patient layout where sidebar is absent) */}
      {!fixed && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ backgroundColor: '#0d7c7c' }}>
            <span className="material-symbols-outlined text-white text-[18px]">health_and_safety</span>
          </div>
          <span className="brand-font text-base font-bold text-primary">MedAxis</span>
        </div>
      )}
      {fixed && <div />}

      {/* Centre: nav links */}
      <nav className="flex items-center gap-6 text-sm">
        <span className="font-semibold cursor-pointer" style={{ color: '#006161' }}>Support</span>
        <span className="cursor-pointer hover:text-on-surface transition-colors" style={{ color: '#3e4948' }}>Directory</span>
        <span className="cursor-pointer hover:text-on-surface transition-colors" style={{ color: '#3e4948' }}>Emergency</span>
      </nav>

      {/* Right: icons + avatar */}
      <div className="flex items-center gap-4">
        <button className="cursor-pointer hover:opacity-70 transition-opacity" style={{ color: '#3e4948' }}>
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <button className="cursor-pointer hover:opacity-70 transition-opacity" style={{ color: '#3e4948' }}>
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </button>
        <button
          onClick={onLogout}
          className="w-8 h-8 rounded-full flex items-center justify-center text-on-primary text-sm font-bold cursor-pointer"
          style={{ backgroundColor: '#006161' }}
          title={`Logout ${user?.name ?? ''}`}
        >
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </div>
    </header>
  )
}

// ── Sidebar nav link ──────────────────────────────────────────────────────
function SidebarLink({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors ${
          isActive
            ? 'font-semibold'
            : 'hover:bg-surface-container'
        }`
      }
      style={({ isActive }) =>
        isActive
          ? { backgroundColor: '#006161', color: '#ffffff' }
          : { color: '#3e4948' }
      }
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}
