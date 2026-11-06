import { NavLink, Outlet } from 'react-router-dom';
import { ExternalLink, FolderOpen, Gauge, History, Settings, SlidersHorizontal } from 'lucide-react';
import { BRAND, BRAND_TEAM } from '../../lib/branding';
import { primary } from './styles';
import { FeedbackHost } from './ui';
import { useSounds } from './useSounds';

const LINKS = [
  { to: '/', label: 'Scoreboard', icon: Gauge },
  { to: '/setup', label: 'Game Setup', icon: SlidersHorizontal },
  { to: '/configs', label: 'Configurations', icon: FolderOpen },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const OperatorLayout: React.FC = () => {
  useSounds();

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-3">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 print:hidden">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span aria-hidden className="w-2 h-6 rounded-sm" style={{ background: BRAND.red }} />
            {BRAND_TEAM.name} Scoreboard
          </h1>
          <nav aria-label="Main" className="flex flex-wrap gap-1 flex-1">
            {LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold ${isActive ? 'bg-neutral-100 text-black' : 'text-neutral-200 hover:bg-neutral-800'}`}>
                <Icon size={16} />{label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => window.open('/display', '_blank')} className={`${primary} px-3 py-2 text-sm`}>
            Open Display <ExternalLink size={16} />
          </button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
      <FeedbackHost />
    </div>
  );
};
