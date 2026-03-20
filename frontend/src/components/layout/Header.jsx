import { LogOut, User, Bell, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_COLORS = {
  admin:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  staff:   'bg-gray-100 text-gray-600',
};

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block text-sm text-gray-500">
          Philippine MSME Inventory & Procurement System
        </div>
        <div className="sm:hidden text-sm font-semibold text-gray-800">
          InvenTrack PH
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div className="hidden sm:block text-sm">
            <div className="font-medium text-gray-900">{user?.full_name}</div>
            <div className={`badge text-xs ${ROLE_COLORS[user?.role] || ''}`}>{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
