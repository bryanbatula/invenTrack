import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Download, FileText, BarChart3, Package, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const peso = (n) => `₱${new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n || 0)}`;
const fmt  = (n) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n || 0);

function SectionHeader({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-50 rounded-lg"><Icon size={18} className="text-blue-600" /></div>
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [movType, setMovType] = useState('');
  const [movPage, setMovPage] = useState(1);

  const { data: birInventory, isLoading: birLoading } = useQuery({
    queryKey: ['bir-inventory'],
    queryFn: () => api.get('/api/reports/bir-inventory').then(r => r.data),
  });

  const { data: procurement } = useQuery({
    queryKey: ['procurement-summary', from, to],
    queryFn: () => api.get('/api/reports/procurement-summary', { params: { from, to } }).then(r => r.data),
  });

  const { data: movements } = useQuery({
    queryKey: ['stock-movements-report', movType, from, to, movPage],
    queryFn: () => api.get('/api/reports/stock-movements', {
      params: { type: movType, from, to, page: movPage, limit: 30 },
    }).then(r => r.data),
  });

  const exportBIRCSV = async () => {
    try {
      const { data: blob } = await api.get('/api/reports/bir-inventory/export', { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BIR_Annex_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('BIR Annex CSV exported successfully');
    } catch {
      toast.error('Export failed');
    }
  };

  const exportProcurementCSV = () => {
    if (!procurement?.length) return;
    const headers = ['PO Number', 'PO Date', 'Supplier', 'TIN', 'Subtotal', 'VAT Amount', 'Total Amount', 'Status'];
    const rows = procurement.map(r => [
      r.po_number, r.po_date, r.supplier, r.tin, r.subtotal, r.vat_amount, r.total_amount, r.status
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Procurement_Summary_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Procurement CSV exported');
  };

  const totalInventoryValue = birInventory?.reduce((sum, i) => sum + parseFloat(i['Total Value'] || 0), 0) || 0;
  const vatableItems = birInventory?.filter(i => i['VAT Status'] === 'VAT').length || 0;
  const totalProcurement = procurement?.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0) || 0;
  const totalVATPaid = procurement?.reduce((sum, p) => sum + parseFloat(p.vat_amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">BIR Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Audit-ready reports for BIR compliance and internal use</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Inventory Value', value: peso(totalInventoryValue), sub: 'FIFO (PAS 2)' },
          { label: 'VAT-able Items', value: vatableItems, sub: `of ${birInventory?.length || 0} total items` },
          { label: 'Total Procurement', value: peso(totalProcurement), sub: 'All POs (filtered period)' },
          { label: 'Total Input VAT', value: peso(totalVATPaid), sub: 'From purchases' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <div className="text-sm text-gray-500">{k.label}</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{k.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Date filters */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input type="date" className="input w-36" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input type="date" className="input w-36" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={() => { setFrom(''); setTo(''); }} className="btn-secondary text-xs">Clear</button>
      </div>

      {/* ── BIR Inventory List ─────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <SectionHeader
            icon={FileText}
            title="BIR Inventory List"
            sub="Item Code · Description · Location · FIFO Valuation (PAS 2 Compliant)"
          />
          <button onClick={exportBIRCSV} className="btn-primary shrink-0">
            <Download size={16} /> Export BIR Annex CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Item Code', 'Description', 'Category', 'Unit', 'Location', 'Qty on Hand', 'Unit Cost (FIFO)', 'Total Value', 'VAT'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {birLoading && <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Loading…</td></tr>}
              {birInventory?.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs font-medium">{item['Item Code']}</td>
                  <td className="px-3 py-2 text-gray-900">{item['Item Description']}</td>
                  <td className="px-3 py-2 text-gray-500">{item['Category'] || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{item['Unit']}</td>
                  <td className="px-3 py-2 text-gray-500">{item['Location/Warehouse'] || '—'}</td>
                  <td className="px-3 py-2 font-semibold text-gray-900">{fmt(item['Quantity on Hand'])}</td>
                  <td className="px-3 py-2">{peso(item['Unit Cost (FIFO)'])}</td>
                  <td className="px-3 py-2 font-semibold">{peso(item['Total Value'])}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ${item['VAT Status'] === 'VAT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item['VAT Status']}
                    </span>
                  </td>
                </tr>
              ))}
              {!birLoading && birInventory?.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">No inventory items</td></tr>
              )}
            </tbody>
            {birInventory?.length > 0 && (
              <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-right text-sm font-semibold text-blue-900">TOTAL INVENTORY VALUE:</td>
                  <td className="px-3 py-2 font-bold text-blue-900">{peso(totalInventoryValue)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Procurement Summary ────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <SectionHeader
            icon={BarChart3}
            title="Procurement Summary"
            sub="Purchase Orders with VAT breakdown — supplier TIN for BIR input tax claims"
          />
          <button onClick={exportProcurementCSV} className="btn-secondary shrink-0">
            <Download size={16} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['PO Number', 'PO Date', 'Supplier', 'TIN', 'Subtotal', 'VAT (12%)', 'Total', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {procurement?.map((po, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs font-medium text-blue-700">{po.po_number}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{po.po_date ? format(new Date(po.po_date), 'MMM dd, yyyy') : '—'}</td>
                  <td className="px-3 py-2">{po.supplier}</td>
                  <td className="px-3 py-2 font-mono text-xs">{po.tin || '—'}</td>
                  <td className="px-3 py-2">{peso(po.subtotal)}</td>
                  <td className="px-3 py-2 text-green-700">{peso(po.vat_amount)}</td>
                  <td className="px-3 py-2 font-semibold">{peso(po.total_amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ${po.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{po.status}</span>
                  </td>
                </tr>
              ))}
              {procurement?.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No procurement records</td></tr>
              )}
            </tbody>
            {procurement?.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">TOTALS:</td>
                  <td className="px-3 py-2 font-semibold text-green-700">{peso(totalVATPaid)}</td>
                  <td className="px-3 py-2 font-bold">{peso(totalProcurement)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Stock Movement Ledger ─────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={ArrowUpDown} title="Stock Movement Ledger" sub="Complete audit trail for all inventory changes" />
          <select className="input w-36" value={movType} onChange={e => { setMovType(e.target.value); setMovPage(1); }}>
            <option value="">All Types</option>
            {['receipt', 'issue', 'adjustment', 'return'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Date', 'Item Code', 'Description', 'Type', 'Qty Change', 'Unit Cost', 'Qty After', 'By'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements?.data?.map((mv, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{format(new Date(mv.created_at), 'MMM dd, yyyy HH:mm')}</td>
                  <td className="px-3 py-2 font-mono text-xs">{mv.item_code}</td>
                  <td className="px-3 py-2 text-gray-900 max-w-xs truncate">{mv.description}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ${mv.movement_type === 'receipt' ? 'bg-green-100 text-green-700' : mv.movement_type === 'issue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {mv.movement_type}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-semibold ${parseFloat(mv.qty_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(mv.qty_change) >= 0 ? '+' : ''}{fmt(mv.qty_change)}
                  </td>
                  <td className="px-3 py-2">{mv.unit_cost ? peso(mv.unit_cost) : '—'}</td>
                  <td className="px-3 py-2 font-medium">{fmt(mv.qty_after)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{mv.performed_by_name || 'System'}</td>
                </tr>
              ))}
              {movements?.data?.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No movements</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
