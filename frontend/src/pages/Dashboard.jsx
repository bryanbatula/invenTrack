import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import {
  AlertTriangle, Clock, Package, TrendingUp,
  ShoppingCart, ArrowUpRight, ArrowDownRight, CheckCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/ui/StatusBadge';

function StatCard({ label, value, sub, icon: Icon, color, href }) {
  const content = (
    <div className={`card p-5 flex items-start justify-between hover:shadow-md transition-shadow`}>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}

const MOVEMENT_ICONS = {
  receipt:    { icon: ArrowDownRight, color: 'text-green-600 bg-green-50' },
  issue:      { icon: ArrowUpRight,   color: 'text-red-500 bg-red-50' },
  adjustment: { icon: Package,        color: 'text-blue-600 bg-blue-50' },
  return:     { icon: CheckCircle,    color: 'text-purple-600 bg-purple-50' },
};

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard').then(r => r.data),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading dashboard…</div>
      </div>
    );
  }

  const fmt = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your inventory and procurement activity</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Inventory Value"
          value={fmt(data?.total_inventory_value)}
          sub="FIFO valuation (PAS 2)"
          icon={TrendingUp}
          color="bg-blue-600"
        />
        <StatCard
          label="Total Active Items"
          value={data?.total_items ?? '—'}
          sub="Items in inventory"
          icon={Package}
          color="bg-indigo-600"
          href="/inventory"
        />
        <StatCard
          label="Low Stock Alerts"
          value={data?.low_stock_alerts?.length ?? 0}
          sub="Items below reorder point"
          icon={AlertTriangle}
          color="bg-amber-500"
          href="/inventory?low_stock=true"
        />
        <StatCard
          label="Pending Approvals"
          value={data?.pending_approvals?.length ?? 0}
          sub="Purchase requests awaiting review"
          icon={Clock}
          color="bg-rose-500"
          href="/procurement/purchase-requests?status=pending"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Low Stock Alerts</h2>
            </div>
            <Link to="/inventory?low_stock=true" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.low_stock_alerts?.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">All items are sufficiently stocked</div>
            )}
            {data?.low_stock_alerts?.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.description}</div>
                  <div className="text-xs text-gray-400">{item.item_code} · {item.location || 'No location'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-600">
                    {item.current_qty} {item.unit_of_measure}
                  </div>
                  <div className="text-xs text-gray-400">Min: {item.reorder_point}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-rose-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Pending PR Approvals</h2>
            </div>
            <Link to="/procurement/purchase-requests?status=pending" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.pending_approvals?.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No pending approvals</div>
            )}
            {data?.pending_approvals?.map(pr => (
              <div key={pr.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{pr.pr_number}</div>
                  <div className="text-xs text-gray-400">
                    {pr.requested_by_name} · {pr.department || 'No dept'} · {pr.item_count} item(s)
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status="pending" />
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Stock Movements</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {data?.recent_movements?.map(mv => {
            const cfg = MOVEMENT_ICONS[mv.movement_type] || MOVEMENT_ICONS.adjustment;
            const MvIcon = cfg.icon;
            return (
              <div key={mv.id} className="px-5 py-3 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${cfg.color}`}>
                  <MvIcon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{mv.description}</div>
                  <div className="text-xs text-gray-400">{mv.item_code} · {mv.performed_by_name || 'System'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-semibold ${mv.qty_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {mv.qty_change >= 0 ? '+' : ''}{mv.qty_change}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(mv.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
