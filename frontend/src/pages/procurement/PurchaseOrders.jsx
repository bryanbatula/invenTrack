import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Plus, Eye, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n || 0)}`;

function POForm({ suppliers, items: invItems, approvedPRs, onClose, onSave }) {
  const [form, setForm] = useState({ pr_id: '', supplier_id: '', delivery_date: '', terms: 'Cash', notes: '' });
  const [lines, setLines] = useState([{ item_id: '', qty_ordered: 1, unit_cost: '', vat_rate: 12 }]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => setLines(l => [...l, { item_id: '', qty_ordered: 1, unit_cost: '', vat_rate: 12 }]);
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine = (i, k, v) => setLines(l => l.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const selectedSupplier = suppliers?.find(s => s.id === form.supplier_id);
  const vatRate = selectedSupplier?.is_vat_registered ? 12 : 0;
  const subtotal = lines.reduce((sum, l) => sum + (parseFloat(l.qty_ordered) || 0) * (parseFloat(l.unit_cost) || 0), 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Linked PR (optional)</label>
          <select className="input" value={form.pr_id} onChange={e => set('pr_id', e.target.value)}>
            <option value="">— None —</option>
            {approvedPRs?.map(pr => <option key={pr.id} value={pr.id}>{pr.pr_number} — {pr.requested_by_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
          <select className="input" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} required>
            <option value="">— Select supplier —</option>
            {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name} {s.is_vat_registered ? '(VAT)' : '(Non-VAT)'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
          <input type="date" className="input" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
          <select className="input" value={form.terms} onChange={e => set('terms', e.target.value)}>
            {['Cash', '30 Days', '60 Days', 'COD', 'Prepaid'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Order Lines</label>
          <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Plus size={12} /> Add Line
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Item', 'Qty', 'Unit Cost (excl. VAT)', 'VAT %', 'Line Total', ''].map(h => (
                <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <select className="input text-xs" value={line.item_id} onChange={e => setLine(i, 'item_id', e.target.value)}>
                    <option value="">— Select —</option>
                    {invItems?.map(it => <option key={it.id} value={it.id}>{it.item_code} — {it.description}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2 w-20"><input type="number" className="input text-xs" value={line.qty_ordered} onChange={e => setLine(i, 'qty_ordered', e.target.value)} min="1" /></td>
                <td className="py-1 pr-2 w-32"><input type="number" className="input text-xs" value={line.unit_cost} onChange={e => setLine(i, 'unit_cost', e.target.value)} placeholder="0.00" step="0.01" /></td>
                <td className="py-1 pr-2 w-20">
                  <span className={`badge ${vatRate === 12 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{vatRate}%</span>
                </td>
                <td className="py-1 pr-2 w-28 font-medium text-gray-700">
                  {peso((parseFloat(line.qty_ordered) || 0) * (parseFloat(line.unit_cost) || 0))}
                </td>
                <td className="py-1"><button onClick={() => removeLine(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal (excl. VAT):</span><span className="font-medium">{peso(subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">VAT ({vatRate}%):</span><span className="font-medium">{peso(vatAmount)}</span></div>
        <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total:</span><span className="font-bold text-lg">{peso(total)}</span></div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Special instructions…" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({ ...form, items: lines.filter(l => l.item_id && l.unit_cost) })} disabled={!form.supplier_id}>
          Create PO
        </button>
      </div>
    </div>
  );
}

function PODetail({ po, canCancel, onCancel }) {
  if (!po) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">PO Number:</span> <span className="font-mono font-medium">{po.po_number}</span></div>
        <div><span className="text-gray-500">Status:</span> <StatusBadge status={po.status} /></div>
        <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{po.supplier_name}</span></div>
        <div><span className="text-gray-500">TIN:</span> <span className="font-mono">{po.tin || '—'}</span></div>
        <div><span className="text-gray-500">Address:</span> <span>{po.supplier_address || '—'}</span></div>
        <div><span className="text-gray-500">Prepared by:</span> <span>{po.prepared_by_name}</span></div>
        <div><span className="text-gray-500">PO Date:</span> <span>{format(new Date(po.po_date), 'MMM dd, yyyy')}</span></div>
        <div><span className="text-gray-500">Delivery Date:</span> <span>{po.delivery_date ? format(new Date(po.delivery_date), 'MMM dd, yyyy') : '—'}</span></div>
        <div><span className="text-gray-500">Terms:</span> <span>{po.terms}</span></div>
        <div><span className="text-gray-500">VAT Registered:</span> <span>{po.is_vat_registered ? 'Yes (12%)' : 'No'}</span></div>
      </div>
      <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>{['Item Code', 'Description', 'Qty Ordered', 'Unit Cost', 'VAT', 'Line Total', 'Received'].map(h => (
            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {po.items?.map(item => (
            <tr key={item.id}>
              <td className="px-3 py-2 font-mono text-xs">{item.item_code}</td>
              <td className="px-3 py-2">{item.description}</td>
              <td className="px-3 py-2">{item.qty_ordered}</td>
              <td className="px-3 py-2">{peso(item.unit_cost)}</td>
              <td className="px-3 py-2"><span className="badge bg-green-100 text-green-700">{item.vat_rate}%</span></td>
              <td className="px-3 py-2 font-medium">{peso(item.line_total)}</td>
              <td className="px-3 py-2">{item.qty_received} / {item.qty_ordered}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{peso(po.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">VAT:</span><span>{peso(po.vat_amount)}</span></div>
        <div className="flex justify-between font-bold border-t pt-2"><span>Total:</span><span>{peso(po.total_amount)}</span></div>
      </div>

      {canCancel && (
        <div className="border-t pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Cancel PO
          </button>
          <p className="text-xs text-gray-400 mt-1">Only pending POs can be cancelled. Admin only.</p>
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewPO, setViewPO] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pos', statusFilter, page],
    queryFn: () => api.get('/api/procurement/purchase-orders', { params: { status: statusFilter, page, limit: 20 } }).then(r => r.data),
  });
  const { data: poDetail } = useQuery({
    queryKey: ['po-detail', viewPO?.id],
    queryFn: () => api.get(`/api/procurement/purchase-orders/${viewPO.id}`).then(r => r.data),
    enabled: !!viewPO,
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => api.get('/api/suppliers', { params: { limit: 500 } }).then(r => r.data.data),
  });
  const { data: approvedPRs } = useQuery({
    queryKey: ['prs-approved'],
    queryFn: () => api.get('/api/procurement/purchase-requests', { params: { status: 'approved', limit: 100 } }).then(r => r.data.data),
  });
  const { data: invItems } = useQuery({
    queryKey: ['inv-items-simple'],
    queryFn: () => api.get('/api/inventory', { params: { limit: 500 } }).then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/api/procurement/purchase-orders', body),
    onSuccess: () => { qc.invalidateQueries(['pos']); toast.success('PO created'); setShowCreate(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error creating PO'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/procurement/purchase-orders/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries(['pos']); toast.success('PO cancelled'); setViewPO(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Cannot cancel this PO'),
  });

  const canCreate = ['admin', 'manager'].includes(user?.role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500">Step 3 of 4 — generated from approved PRs</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> New PO
          </button>
        )}
      </div>

      <div className="card p-4 flex gap-3">
        <select className="input w-44" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {['open', 'partially_received', 'received', 'cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['PO Number', 'Supplier', 'TIN', 'PO Date', 'Total', 'VAT', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && data?.data?.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No POs found</td></tr>}
            {data?.data?.map(po => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">{po.po_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{po.supplier_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{po.supplier_tin || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(po.po_date), 'MMM dd, yyyy')}</td>
                <td className="px-4 py-3 font-semibold">{peso(po.total_amount)}</td>
                <td className="px-4 py-3 text-gray-600">{peso(po.vat_amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => setViewPO(po)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 pb-4">
          <Pagination page={page} limit={20} total={data?.total || 0} onPage={setPage} />
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Purchase Order" size="xl">
        <POForm
          suppliers={suppliers}
          items={invItems}
          approvedPRs={approvedPRs}
          onClose={() => setShowCreate(false)}
          onSave={(f) => createMutation.mutate(f)}
        />
      </Modal>

      <Modal open={!!viewPO} onClose={() => setViewPO(null)} title={`PO Details — ${viewPO?.po_number}`} size="lg">
        <PODetail
          po={poDetail}
          canCancel={user?.role === 'admin' && poDetail?.status === 'pending'}
          onCancel={() => cancelMutation.mutate(viewPO.id)}
        />
      </Modal>
    </div>
  );
}
