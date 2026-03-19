import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Plus, Search, Edit2, Trash2, Building2, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function SupplierForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    supplier_code: '', name: '', tin: '', address: '',
    contact_person: '', contact_number: '', email: '', is_vat_registered: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code *</label>
          <input className="input" value={form.supplier_code} onChange={e => set('supplier_code', e.target.value)}
            placeholder="e.g. SUP-001" disabled={!!initial} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TIN
            <span className="ml-1 text-xs text-gray-400 font-normal">(BIR format: xxx-xxx-xxx-xxxV)</span>
          </label>
          <input className="input font-mono" value={form.tin} onChange={e => set('tin', e.target.value)}
            placeholder="000-000-000-000V" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full registered business name" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Address
          <span className="ml-1 text-xs text-gray-400 font-normal">(registered address for BIR)</span>
        </label>
        <textarea className="input" rows={2} value={form.address} onChange={e => set('address', e.target.value)}
          placeholder="Unit/Lot, Street, Barangay, City/Municipality, Province, Zip" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input className="input" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
          <input className="input" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="+63 9XX-XXX-XXXX" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>

      {/* VAT Toggle */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">VAT Registration Status</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {form.is_vat_registered
                ? 'VAT-registered — 12% VAT will be applied to all POs'
                : 'Non-VAT — No VAT on POs from this supplier (per NIRC Sec. 109)'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => set('is_vat_registered', !form.is_vat_registered)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_vat_registered ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.is_vat_registered ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <div className="mt-2">
          <span className={`badge ${form.is_vat_registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {form.is_vat_registered ? 'VAT (12%)' : 'Non-VAT (0%)'}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.name || !form.supplier_code}>
          {initial ? 'Save Changes' : 'Add Supplier'}
        </button>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, page],
    queryFn: () => api.get('/api/suppliers', { params: { search, page, limit: 20 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/api/suppliers', body),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); toast.success('Supplier added'); setShowAdd(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error adding supplier'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/api/suppliers/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); toast.success('Supplier updated'); setEditSupplier(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error updating supplier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); toast.success('Supplier deactivated'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const canEdit = ['admin', 'manager'].includes(user?.role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Supplier Master</h1>
          <p className="text-sm text-gray-500">BIR-compliant: stores TIN, address & VAT status</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      <div className="card p-4 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, TIN, code…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Code', 'Supplier Name', 'TIN', 'Address', 'Contact', 'VAT', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && data?.data?.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <Building2 size={32} className="text-gray-300" />
                  No suppliers found
                </div>
              </td></tr>
            )}
            {data?.data?.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-medium">{s.supplier_code}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{s.name}</div>
                  {s.contact_person && <div className="text-xs text-gray-400">{s.contact_person}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.tin || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-48 truncate" title={s.address}>{s.address || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {s.contact_number && <div>{s.contact_number}</div>}
                  {s.email && <div className="text-blue-600">{s.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${s.is_vat_registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_vat_registered ? 'VAT (12%)' : 'Non-VAT'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditSupplier(s)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                        <Edit2 size={14} />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => { if (confirm(`Deactivate ${s.name}?`)) deleteMutation.mutate(s.id); }}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        ><Trash2 size={14} /></button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 pb-4">
          <Pagination page={page} limit={20} total={data?.total || 0} onPage={setPage} />
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Supplier" size="md">
        <SupplierForm onClose={() => setShowAdd(false)} onSave={(f) => createMutation.mutate(f)} />
      </Modal>
      <Modal open={!!editSupplier} onClose={() => setEditSupplier(null)} title="Edit Supplier" size="md">
        {editSupplier && (
          <SupplierForm
            initial={editSupplier}
            onClose={() => setEditSupplier(null)}
            onSave={(f) => updateMutation.mutate({ id: editSupplier.id, ...f })}
          />
        )}
      </Modal>
    </div>
  );
}
