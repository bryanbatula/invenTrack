import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import {
  Search, Plus, Download, Filter, AlertTriangle,
  Package, ChevronRight, X, SlidersHorizontal,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

const fmt = (n) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n || 0);
const peso = (n) => `₱${fmt(n)}`;

function ItemForm({ initial, categories, onClose, onSave }) {
  const [form, setForm] = useState(initial || {
    item_code: '', description: '', category_id: '', unit_of_measure: 'pc',
    location: '', reorder_point: 0, is_vatable: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Code *</label>
          <input className="input" value={form.item_code} onChange={e => set('item_code', e.target.value)}
            placeholder="e.g. RAW-001" disabled={!!initial} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
          <select className="input" value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)}>
            {['pc','box','kg','liter','meter','pack','set','dozen','ream','bag'].map(u =>
              <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <input className="input" value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Full item description" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">— Select —</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location / Warehouse</label>
          <input className="input" value={form.location} onChange={e => set('location', e.target.value)}
            placeholder="e.g. Bodega A, Shelf 3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
          <input type="number" className="input" value={form.reorder_point}
            onChange={e => set('reorder_point', e.target.value)} min="0" />
        </div>
        <div className="flex items-end gap-3 pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_vatable} onChange={e => set('is_vatable', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm font-medium text-gray-700">VAT-able (12%)</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(form)}>
          {initial ? 'Save Changes' : 'Create Item'}
        </button>
      </div>
    </div>
  );
}

function AdjustForm({ item, onClose, onSave }) {
  const [form, setForm] = useState({ qty_change: '', unit_cost: '', reason: '' });
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded-lg text-sm">
        <span className="font-medium">{item.item_code}</span> — {item.description}
        <br />
        <span className="text-gray-500">Current stock: </span>
        <span className="font-semibold">{item.current_qty} {item.unit_of_measure}</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantity Change <span className="text-gray-400 font-normal">(use negative to reduce)</span>
        </label>
        <input type="number" className="input" value={form.qty_change}
          onChange={e => setForm(f => ({ ...f, qty_change: e.target.value }))}
          placeholder="e.g. 10 or -5" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (if adding stock)</label>
        <input type="number" className="input" value={form.unit_cost}
          onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))}
          placeholder="Cost excl. VAT" min="0" step="0.01" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
        <input className="input" value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          placeholder="e.g. Physical count adjustment" />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(form)} disabled={!form.qty_change}>
          Apply Adjustment
        </button>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStock, setLowStock] = useState(searchParams.get('low_stock') === 'true');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/inventory/categories').then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, categoryFilter, lowStock, page],
    queryFn: () => api.get('/api/inventory', {
      params: { search, category_id: categoryFilter, low_stock: lowStock, page, limit: 20 },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: detail } = useQuery({
    queryKey: ['item-detail', detailItem?.id],
    queryFn: () => api.get(`/api/inventory/${detailItem?.id}`).then(r => r.data),
    enabled: !!detailItem,
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/api/inventory', body),
    onSuccess: () => { qc.invalidateQueries(['inventory']); toast.success('Item created'); setShowAdd(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error creating item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/api/inventory/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['inventory']); toast.success('Item updated'); setEditItem(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error updating item'),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.post(`/api/inventory/${id}/adjust`, body),
    onSuccess: () => { qc.invalidateQueries(['inventory']); qc.invalidateQueries(['dashboard']); toast.success('Stock adjusted'); setAdjustItem(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error adjusting stock'),
  });

  const exportCSV = async () => {
    const { data: blob } = await api.get('/api/reports/bir-inventory/export', { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BIR_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const canEdit = ['admin', 'manager'].includes(user?.role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory List</h1>
          <p className="text-sm text-gray-500">FIFO valuation · PAS 2 compliant</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary">
            <Download size={16} /> Export BIR CSV
          </button>
          {canEdit && (
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by code or description…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>
        <select className="input w-44" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {catData?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }}
            className="w-4 h-4 text-amber-500 rounded" />
          <AlertTriangle size={14} className="text-amber-500" />
          Low Stock Only
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Item Code', 'Description', 'Category', 'Location', 'Qty on Hand', 'Unit Cost (FIFO)', 'Total Value', 'VAT', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && data?.data?.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No items found</td></tr>
              )}
              {data?.data?.map(item => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    item.current_qty <= item.reorder_point ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.item_code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.description}</div>
                    <div className="text-xs text-gray-400">{item.unit_of_measure}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.category_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.location || '—'}</td>
                  <td className="px-4 py-3">
                    <div className={`font-semibold ${item.current_qty <= item.reorder_point ? 'text-red-600' : 'text-gray-900'}`}>
                      {fmt(item.current_qty)}
                    </div>
                    {item.current_qty <= item.reorder_point && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle size={10} /> Low stock
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{peso(item.fifo_unit_cost)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{peso(item.total_value)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${item.is_vatable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.is_vatable ? 'VAT' : 'Non-VAT'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDetailItem(item)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="View FIFO lots"
                      ><ChevronRight size={14} /></button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => setEditItem(item)}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 text-xs font-medium"
                            title="Edit"
                          ><SlidersHorizontal size={14} /></button>
                          <button
                            onClick={() => setAdjustItem(item)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                            title="Adjust stock"
                          ><Package size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Pagination page={page} limit={20} total={data?.total || 0} onPage={setPage} />
        </div>
      </div>

      {/* Modals */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Item">
        <ItemForm categories={catData} onClose={() => setShowAdd(false)} onSave={(f) => createMutation.mutate(f)} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Item">
        {editItem && (
          <ItemForm
            initial={editItem}
            categories={catData}
            onClose={() => setEditItem(null)}
            onSave={(f) => updateMutation.mutate({ id: editItem.id, ...f })}
          />
        )}
      </Modal>

      <Modal open={!!adjustItem} onClose={() => setAdjustItem(null)} title="Stock Adjustment">
        {adjustItem && (
          <AdjustForm
            item={adjustItem}
            onClose={() => setAdjustItem(null)}
            onSave={(f) => adjustMutation.mutate({ id: adjustItem.id, ...f })}
          />
        )}
      </Modal>

      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title={`FIFO Lots — ${detailItem?.item_code}`} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
              <div><div className="text-gray-500">Current Qty</div><div className="font-semibold text-lg">{fmt(detail.current_qty)} {detail.unit_of_measure}</div></div>
              <div><div className="text-gray-500">FIFO Unit Cost</div><div className="font-semibold">{peso(detail.fifo_unit_cost)}</div></div>
              <div><div className="text-gray-500">Total Value</div><div className="font-semibold">{peso(detail.total_value)}</div></div>
            </div>
            <h3 className="font-semibold text-sm text-gray-700">Available FIFO Lots (oldest first)</h3>
            <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  {['Lot #', 'Receipt Date', 'Qty Received', 'Qty Remaining', 'Unit Cost', 'Lot Value'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detail.fifo_lots?.map((lot, i) => (
                  <tr key={lot.id} className={i === 0 ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2 font-mono text-xs">{lot.lot_number || `LOT-${i + 1}`}</td>
                    <td className="px-3 py-2">{lot.receipt_date}</td>
                    <td className="px-3 py-2">{fmt(lot.qty_received)}</td>
                    <td className="px-3 py-2 font-semibold">{fmt(lot.qty_remaining)}</td>
                    <td className="px-3 py-2">{peso(lot.unit_cost)}</td>
                    <td className="px-3 py-2 font-semibold">{peso(lot.qty_remaining * lot.unit_cost)}</td>
                  </tr>
                ))}
                {detail.fifo_lots?.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">No lots on hand</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
