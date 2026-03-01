import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  CreditCard,
  LogOut,
  Mic2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const nav = [
  { to: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/exercises',    label: 'Exercises',   icon: BookOpen },
  { to: '/analytics',   label: 'Analytics',   icon: BarChart2 },
  { to: '/subscription', label: 'Subscription', icon: CreditCard },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        // Base: fixed drawer on mobile, static column on md+
        'fixed inset-y-0 left-0 z-30 w-60 flex flex-col bg-white border-r border-gray-100',
        'transform transition-transform duration-300 ease-in-out',
        // md+: always visible, relative positioning in flow
        'md:static md:translate-x-0 md:z-auto md:shrink-0',
        // mobile: slide in/out
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
          <Mic2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">Proxena</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
