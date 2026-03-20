import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, ClipboardList,
  Truck, Users, BarChart3, Building2, ChevronDown, X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const NavItem = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 border border-blue-100'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`
    }
  >
    <Icon size={18} />
    {label}
  </NavLink>
);

const CollapsibleSection = ({ icon: Icon, label, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"
      >
        <span className="flex items-center gap-2"><Icon size={14} />{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="space-y-1 mt-1">{children}</div>}
    </div>
  );
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col shrink-0
      transform transition-transform duration-200 ease-in-out
      lg:static lg:translate-x-0
      ${open ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">InvenTrack PH</div>
            <div className="text-xs text-gray-400">BIR-Ready System</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />

        <CollapsibleSection icon={Package} label="Inventory">
          <NavItem to="/inventory" icon={Package} label="Inventory List" onClick={onClose} />
        </CollapsibleSection>

        <CollapsibleSection icon={ShoppingCart} label="Procurement">
          <NavItem to="/procurement/purchase-requests" icon={ClipboardList} label="Purchase Requests" onClick={onClose} />
          <NavItem to="/procurement/purchase-orders" icon={ShoppingCart} label="Purchase Orders" onClick={onClose} />
          <NavItem to="/procurement/receiving-reports" icon={Truck} label="Receiving Reports" onClick={onClose} />
        </CollapsibleSection>

        <CollapsibleSection icon={Building2} label="Master Data">
          <NavItem to="/suppliers" icon={Building2} label="Suppliers" onClick={onClose} />
          {user?.role === 'admin' && (
            <NavItem to="/users" icon={Users} label="Users" onClick={onClose} />
          )}
        </CollapsibleSection>

        <CollapsibleSection icon={BarChart3} label="Reports">
          <NavItem to="/reports" icon={BarChart3} label="BIR Reports" onClick={onClose} />
        </CollapsibleSection>
      </nav>

      {/* PH Flag accent */}
      <div className="h-1 flex">
        <div className="flex-1" style={{ background: '#0038a8' }} />
        <div className="flex-1" style={{ background: '#fcd116' }} />
        <div className="flex-1" style={{ background: '#ce1126' }} />
      </div>
    </aside>
  );
}
