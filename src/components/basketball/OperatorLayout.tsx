import { NavLink, Outlet } from 'react-router-dom';
import { ExternalLink, FolderOpen, Gauge, History, Images, LayoutTemplate, SlidersHorizontal, Users } from 'lucide-react';
import { BRAND, BRAND_TEAM } from '../../lib/branding';
import { primary } from './styles';
import { FeedbackHost } from './ui';
import { useSounds } from './useSounds';

// Groups keep related nav items together so the operator can scan quickly.
// Scoreboard | Setup | Configs | Roster — then — Media — then — Layout Editor (display customization) — then — History
const NAV_GROUPS = [
  [
    { to: '/', label: 'Scoreboard', icon: Gauge },
    { to: '/setup', label: 'Game Setup', icon: SlidersHorizontal },
    { to: '/configs', label: 'Configurations', icon: FolderOpen },
    { to: '/roster', label: 'Roster', icon: Users },
  ],
  [
    { to: '/media', label: 'Media', icon: Images },
  ],
  [
    { to: '/layout', label: 'Layout Editor', icon: LayoutTemplate },
  ],
  [
    { to: '/history', label: 'History', icon: History },
  ],
];

export const OperatorLayout: React.FC = () => {
  useSounds();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-sm sticky top-0 z-10 px-4 py-3 print:hidden">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          <h1 className="flex items-center gap-2.5 text-xl font-bold whitespace-nowrap">
            <span aria-hidden className="w-2 h-7 rounded-sm flex-none" style={{ background: BRAND.red }} />
            <span className="hidden sm:inline">{BRAND_TEAM.name} Scoreboard</span>
            <span className="sm:hidden">{BRAND_TEAM.abbreviation || BRAND_TEAM.name}</span>
          </h1>
          <nav aria-label="Main" className="flex items-center gap-2 flex-1 min-w-0">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className="flex items-center gap-2">
                {gi > 0 && <span className="w-px h-8 bg-neutral-700 flex-none" aria-hidden />}
                <div className="flex flex-wrap items-center gap-1.5">
                  {group.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${isActive ? 'bg-neutral-100 text-black' : 'text-neutral-200 hover:bg-neutral-800'}`}>
                      <Icon size={16} className="flex-none" />{label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <button onClick={() => window.open('/display', '_blank')} className={`${primary} px-4 py-2 text-sm whitespace-nowrap flex-none`}>
            Open Display <ExternalLink size={16} />
          </button>
        </div>
      </header>
      <main className="px-4 py-4">
        <div className="max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
      <FeedbackHost />
    </div>
  );
};
