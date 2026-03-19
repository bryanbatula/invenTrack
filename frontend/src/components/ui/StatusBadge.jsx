const STATUS_STYLES = {
  pending:            'bg-yellow-100 text-yellow-800',
  approved:           'bg-green-100 text-green-800',
  rejected:           'bg-red-100 text-red-800',
  converted:          'bg-blue-100 text-blue-800',
  open:               'bg-sky-100 text-sky-800',
  partially_received: 'bg-orange-100 text-orange-800',
  received:           'bg-green-100 text-green-800',
  cancelled:          'bg-gray-100 text-gray-600',
  posted:             'bg-green-100 text-green-800',
  draft:              'bg-gray-100 text-gray-600',
};

const LABELS = {
  pending:            'Pending',
  approved:           'Approved',
  rejected:           'Rejected',
  converted:          'Converted to PO',
  open:               'Open',
  partially_received: 'Partial',
  received:           'Received',
  cancelled:          'Cancelled',
  posted:             'Posted',
  draft:              'Draft',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {LABELS[status] || status}
    </span>
  );
}
