import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Plus, Search, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const fmt = (n) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n || 0);

function PRForm({ items: inventoryItems, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ department: '', date_needed: '', purpose: '' });
  const [lines, setLines] = useState([{ item_id: '', qty_requested: 1, unit_of_measure: 'pc', estimated_cost: '', notes: '' }]);

  const addLine = () => setLines(l => [...l, { item_id: '', qty_requested: 1, unit_of_measure: 'pc', estimated_cost: '', notes: '' }]);
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine = (i, k, v) => setLines(l => l.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Warehouse" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Needed</label>
          <input type="date" className="input" value={form.date_needed} onChange={e => setForm(f => ({ ...f, date_needed: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
          <input className="input" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Brief description" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Requested Items</label>
          <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Plus size={12} /> Add Line
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 rounded">
            <tr>
              {['Item', 'Qty', 'UOM', 'Est. Cost', 'Notes', ''].map(h => (
                <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="space-y-1">
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <select className="input text-xs" value={line.item_id} onChange={e => setLine(i, 'item_id', e.target.value)}>
                    <option value="">— Select item —</option>
                    {inventoryItems?.map(it => <option key={it.id} value={it.id}>{it.item_code} — {it.description}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2 w-20"><input type="number" className="input text-xs" value={line.qty_requested} onChange={e => setLine(i, 'qty_requested', e.target.value)} min="1" /></td>
                <td className="py-1 pr-2 w-20"><input className="input text-xs" value={line.unit_of_measure} onChange={e => setLine(i, 'unit_of_measure', e.target.value)} /></td>
                <td className="py-1 pr-2 w-28"><input type="number" className="input text-xs" value={line.estimated_cost} onChange={e => setLine(i, 'estimated_cost', e.target.value)} placeholder="0.00" step="0.01" /></td>
                <td className="py-1 pr-2"><input className="input text-xs" value={line.notes} onChange={e => setLine(i, 'notes', e.target.value)} placeholder="Optional" /></td>
                <td className="py-1">
                  <button onClick={() => removeLine(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({ ...form, items: lines.filter(l => l.item_id) })}>
          Submit PR
        </button>
      </div>
    </div>
  );
}

function PRDetail({ pr, onApprove, canApprove, onCancel, canCancel }) {
  const [action, setAction] = useState(null);
  const [note, setNote] = useState('');

  if (!pr) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">PR Number:</span> <span className="font-medium">{pr.pr_number}</span></div>
        <div><span className="text-gray-500">Status:</span> <StatusBadge status={pr.status} /></div>
        <div><span className="text-gray-500">Requested by:</span> <span className="font-medium">{pr.requested_by_name}</span></div>
        <div><span className="text-gray-500">Department:</span> <span>{pr.department || '—'}</span></div>
        <div><span className="text-gray-500">Date Needed:</span> <span>{pr.date_needed ? format(new Date(pr.date_needed), 'MMM dd, yyyy') : '—'}</span></div>
        <div><span className="text-gray-500">Purpose:</span> <span>{pr.purpose || '—'}</span></div>
        {pr.approved_by_name && <div><span className="text-gray-500">Approved by:</span> <span className="font-medium">{pr.approved_by_name}</span></div>}
        {pr.rejection_note && <div className="col-span-2"><span className="text-gray-500">Rejection Note:</span> <span className="text-red-600">{pr.rejection_note}</span></div>}
      </div>

      <h3 className="font-semibold text-sm text-gray-700 border-t pt-3">Requested Items</h3>
      <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            {['Item Code', 'Description', 'Qty', 'UOM', 'Est. Cost'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pr.items?.map(item => (
            <tr key={item.id}>
              <td className="px-3 py-2 font-mono text-xs">{item.item_code}</td>
              <td className="px-3 py-2">{item.description}</td>
              <td className="px-3 py-2">{item.qty_requested}</td>
              <td className="px-3 py-2">{item.unit_of_measure}</td>
              <td className="px-3 py-2">{item.estimated_cost ? `₱${fmt(item.estimated_cost)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canCancel && (
        <div className="border-t pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Cancel PR
          </button>
          <p className="text-xs text-gray-400 mt-1">Only pending PRs can be cancelled.</p>
        </div>
      )}

      {canApprove && pr.status === 'pending' && (
        <div className="border-t pt-4 space-y-3">
          {action === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Note</label>
              <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for rejection" />
            </div>
          )}
          <div className="flex gap-3">
            {action !== 'reject' ? (
              <>
                <button className="btn-success" onClick={() => onApprove('approve', '')}>
                  <CheckCircle size={16} /> Approve PR
                </button>
                <button className="btn-danger" onClick={() => setAction('reject')}>
                  <XCircle size={16} /> Reject
                </button>
              </>
            ) : (
              <>
                <button className="btn-danger" onClick={() => onApprove('reject', note)} disabled={!note}>
                  <XCircle size={16} /> Confirm Rejection
                </button>
                <button className="btn-secondary" onClick={() => setAction(null)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchaseRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewPR, setViewPR] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['prs', statusFilter, page],
    queryFn: () => api.get('/api/procurement/purchase-requests', { params: { status: statusFilter, page, limit: 20 } }).then(r => r.data),
  });

  const { data: prDetail } = useQuery({
    queryKey: ['pr-detail', viewPR?.id],
    queryFn: () => api.get(`/api/procurement/purchase-requests/${viewPR.id}`).then(r => r.data),
    enabled: !!viewPR,
  });

  const { data: invItems } = useQuery({
    queryKey: ['inv-items-simple'],
    queryFn: () => api.get('/api/inventory', { params: { limit: 500 } }).then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/api/procurement/purchase-requests', body),
    onSuccess: () => { qc.invalidateQueries(['prs']); qc.invalidateQueries(['dashboard']); toast.success('PR submitted'); setShowCreate(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error submitting PR'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action, rejection_note }) => api.patch(`/api/procurement/purchase-requests/${id}/approve`, { action, rejection_note }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['prs']); qc.invalidateQueries(['dashboard']);
      toast.success(vars.action === 'approve' ? 'PR Approved!' : 'PR Rejected');
      setViewPR(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/procurement/purchase-requests/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries(['prs']); toast.success('PR cancelled'); setViewPR(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Cannot cancel this PR'),
  });

  const canApprove = ['admin', 'manager'].includes(user?.role);

  const filtered = data?.data?.filter(pr =>
    !search || pr.pr_number.toLowerCase().includes(search.toLowerCase()) ||
    pr.requested_by_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchase Requests</h1>
          <p className="text-sm text-gray-500">Step 1 of 4 in the procurement workflow</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New PR
        </button>
      </div>

      {/* Workflow banner */}
      <div className="flex items-center gap-0 text-xs overflow-x-auto">
        {['1. Purchase Request', '2. Manager Approval', '3. Purchase Order', '4. Receiving Report'].map((step, i) => (
          <div key={step} className="flex items-center">
            <div className={`px-3 py-2 font-medium whitespace-nowrap ${i === 0 ? 'bg-blue-600 text-white rounded-l-lg' : 'bg-gray-100 text-gray-500'}`}>
              {step}
            </div>
            {i < 3 && <div className={`w-6 h-6 ${i === 0 ? 'bg-blue-600' : 'bg-gray-100'}`} style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />}
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search PR number or requestor…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {['pending', 'approved', 'rejected', 'converted', 'cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['PR Number', 'Requested By', 'Department', 'Items', 'Date', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && filtered?.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No PRs found</td></tr>}
            {filtered?.map(pr => (
              <tr key={pr.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">{pr.pr_number}</td>
                <td className="px-4 py-3 text-gray-900">{pr.requested_by_name}</td>
                <td className="px-4 py-3 text-gray-600">{pr.department || '—'}</td>
                <td className="px-4 py-3 text-gray-700">{pr.item_count}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(pr.created_at), 'MMM dd, yyyy')}</td>
                <td className="px-4 py-3"><StatusBadge status={pr.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => setViewPR(pr)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Purchase Request" size="lg">
        <PRForm items={invItems} onClose={() => setShowCreate(false)} onSave={(f) => createMutation.mutate(f)} />
      </Modal>

      <Modal open={!!viewPR} onClose={() => setViewPR(null)} title={`PR Details — ${viewPR?.pr_number}`} size="lg">
        <PRDetail
          pr={prDetail}
          canApprove={canApprove}
          onApprove={(action, note) => approveMutation.mutate({ id: viewPR.id, action, rejection_note: note })}
          onCancel={() => cancelMutation.mutate(viewPR.id)}
          canCancel={prDetail?.status === 'pending'}
        />
      </Modal>
    </div>
  );
}
