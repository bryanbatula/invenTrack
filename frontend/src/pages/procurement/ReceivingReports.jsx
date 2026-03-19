import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Plus, Eye, Truck, CheckCircle, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n || 0)}`;

function RRForm({ openPOs, onClose, onSave }) {
  const [form, setForm] = useState({ po_id: '', receipt_date: new Date().toISOString().split('T')[0], delivery_note: '', invoice_number: '', remarks: '' });
  const [lines, setLines] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setLine = (i, k, v) => setLines(l => l.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const { data: poDetail } = useQuery({
    queryKey: ['po-detail-rr', form.po_id],
    queryFn: () => api.get(`/api/procurement/purchase-orders/${form.po_id}`).then(r => r.data),
    enabled: !!form.po_id,
  });

  useEffect(() => {
    if (poDetail?.items) {
      setLines(poDetail.items.map(item => ({
        po_item_id: item.id,
        item_id: item.item_id,
        item_code: item.item_code,
        description: item.description,
        unit_of_measure: item.unit_of_measure,
        qty_ordered: item.qty_ordered,
        qty_remaining: item.qty_ordered - item.qty_received,
        qty_received: item.qty_ordered - item.qty_received,
        unit_cost: item.unit_cost,
        lot_number: '',
        expiry_date: '',
      })));
    }
  }, [poDetail]);

  return (
    <div className="space-y-5">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
        <strong>Receive Stock</strong> — Posting this RR will automatically update inventory quantities and create FIFO lots.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order *</label>
          <select className="input" value={form.po_id} onChange={e => set('po_id', e.target.value)} required>
            <option value="">— Select open PO —</option>
            {openPOs?.map(po => <option key={po.id} value={po.id}>{po.po_number} — {po.supplier_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Date</label>
          <input type="date" className="input" value={form.receipt_date} onChange={e => set('receipt_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note #</label>
          <input className="input" value={form.delivery_note} onChange={e => set('delivery_note', e.target.value)} placeholder="Supplier delivery note number" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">BIR Sales Invoice #</label>
          <input className="input" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="Supplier invoice number" />
        </div>
      </div>

      {lines.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Items to Receive</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Item', 'Ordered', 'Qty to Receive', 'Unit Cost', 'Lot #', 'Expiry'].map(h => (
                  <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-2 pr-2">
                    <div className="text-xs font-medium text-gray-900">{line.description}</div>
                    <div className="text-xs text-gray-400 font-mono">{line.item_code}</div>
                  </td>
                  <td className="py-2 pr-2 text-xs text-gray-500">{line.qty_remaining} {line.unit_of_measure}</td>
                  <td className="py-2 pr-2 w-24">
                    <input type="number" className="input text-xs" value={line.qty_received}
                      onChange={e => setLine(i, 'qty_received', e.target.value)}
                      max={line.qty_remaining} min="0" step="0.01" />
                  </td>
                  <td className="py-2 pr-2 w-28">
                    <input type="number" className="input text-xs" value={line.unit_cost}
                      onChange={e => setLine(i, 'unit_cost', e.target.value)} step="0.0001" />
                  </td>
                  <td className="py-2 pr-2 w-28">
                    <input className="input text-xs" value={line.lot_number}
                      onChange={e => setLine(i, 'lot_number', e.target.value)} placeholder="Optional" />
                  </td>
                  <td className="py-2 w-32">
                    <input type="date" className="input text-xs" value={line.expiry_date}
                      onChange={e => setLine(i, 'expiry_date', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
        <textarea className="input" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Condition of goods, discrepancies, etc." />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className="btn-success"
          disabled={!form.po_id || lines.length === 0}
          onClick={() => onSave({ ...form, items: lines.filter(l => parseFloat(l.qty_received) > 0) })}
        >
          <CheckCircle size={16} /> Post RR & Update Stock
        </button>
      </div>
    </div>
  );
}

function RRDetail({ rr }) {
  if (!rr) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">RR Number:</span> <span className="font-mono font-medium">{rr.rr_number}</span></div>
        <div><span className="text-gray-500">Status:</span> <StatusBadge status={rr.status} /></div>
        <div><span className="text-gray-500">PO Number:</span> <span className="font-mono">{rr.po_number}</span></div>
        <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{rr.supplier_name}</span></div>
        <div><span className="text-gray-500">TIN:</span> <span className="font-mono">{rr.tin || '—'}</span></div>
        <div><span className="text-gray-500">Receipt Date:</span> <span>{format(new Date(rr.receipt_date), 'MMM dd, yyyy')}</span></div>
        <div><span className="text-gray-500">Invoice #:</span> <span className="font-mono">{rr.invoice_number || '—'}</span></div>
        <div><span className="text-gray-500">Received by:</span> <span>{rr.received_by_name}</span></div>
      </div>
      <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>{['Item Code', 'Description', 'Qty Received', 'Unit Cost', 'Lot #'].map(h => (
            <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rr.items?.map(item => (
            <tr key={item.id}>
              <td className="px-3 py-2 font-mono text-xs">{item.item_code}</td>
              <td className="px-3 py-2">{item.description}</td>
              <td className="px-3 py-2 font-semibold">{item.qty_received} {item.unit_of_measure}</td>
              <td className="px-3 py-2">{peso(item.unit_cost)}</td>
              <td className="px-3 py-2 font-mono text-xs">{item.lot_number || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rr.remarks && (
        <div className="p-3 bg-gray-50 rounded text-sm">
          <span className="text-gray-500">Remarks:</span> {rr.remarks}
        </div>
      )}
    </div>
  );
}

export default function ReceivingReports() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewRR, setViewRR] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['rrs', page],
    queryFn: () => api.get('/api/procurement/receiving-reports', { params: { page, limit: 20 } }).then(r => r.data),
  });

  const { data: rrDetail } = useQuery({
    queryKey: ['rr-detail', viewRR?.id],
    queryFn: () => api.get(`/api/procurement/receiving-reports/${viewRR.id}`).then(r => r.data),
    enabled: !!viewRR,
  });

  const { data: openPOs } = useQuery({
    queryKey: ['pos-open'],
    queryFn: () => api.get('/api/procurement/purchase-orders', { params: { status: 'open', limit: 200 } }).then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/api/procurement/receiving-reports', body),
    onSuccess: () => {
      qc.invalidateQueries(['rrs']);
      qc.invalidateQueries(['inventory']);
      qc.invalidateQueries(['dashboard']);
      qc.invalidateQueries(['pos']);
      toast.success('Stock received! Inventory updated.');
      setShowCreate(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error posting RR'),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Receiving Reports</h1>
          <p className="text-sm text-gray-500">Step 4 of 4 — posts stock into FIFO inventory lots</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-success">
          <Truck size={16} /> Receive Stock
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['RR Number', 'PO Number', 'Supplier', 'Receipt Date', 'Invoice #', 'Received by', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && data?.data?.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No receiving reports yet</td></tr>}
            {data?.data?.map(rr => (
              <tr key={rr.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-medium text-emerald-700">{rr.rr_number}</td>
                <td className="px-4 py-3 font-mono text-xs">{rr.po_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{rr.supplier_name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(rr.receipt_date), 'MMM dd, yyyy')}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{rr.invoice_number || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{rr.received_by_name}</td>
                <td className="px-4 py-3"><StatusBadge status={rr.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => setViewRR(rr)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Receive Stock — New Receiving Report" size="xl">
        <RRForm
          openPOs={openPOs}
          onClose={() => setShowCreate(false)}
          onSave={(f) => createMutation.mutate(f)}
        />
      </Modal>

      <Modal open={!!viewRR} onClose={() => setViewRR(null)} title={`RR Details — ${viewRR?.rr_number}`} size="lg">
        <RRDetail rr={rrDetail} />
      </Modal>
    </div>
  );
}
