import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Plus, UserCheck, Shield, Users as UsersIcon, Trash2, User, AlertTriangle } from 'lucide-react';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const ROLE_STYLES = {
  admin:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  staff:   'bg-gray-100 text-gray-600',
};

function UserForm({ onClose, onSave, loading }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'staff' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Juan dela Cruz" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="juan@company.ph" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
          <option value="staff">Staff — Can view & create PRs/RRs</option>
          <option value="manager">Manager — Can approve PRs & create POs</option>
          <option value="admin">Admin — Full access</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={() => onSave(form)}
          disabled={loading || !form.full_name || !form.email || !form.password}
        >
          {loading ? 'Creating…' : 'Create User'}
        </button>
      </div>
    </div>
  );
}

export default function Users() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/auth/users').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/auth/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted');
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error deleting user'),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/api/auth/register', body),
    onSuccess: () => {
      toast.success('User created successfully');
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error creating user'),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">Admin only — manage system users and roles</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Shield,    color: 'bg-purple-600', label: 'Admin',   sub: 'Full system access, user management' },
          { icon: UserCheck, color: 'bg-blue-600',   label: 'Manager', sub: 'Approve PRs, create POs' },
          { icon: UsersIcon, color: 'bg-gray-500',   label: 'Staff',   sub: 'Submit PRs, receive stock' },
        ].map(r => (
          <div key={r.label} className="card p-4 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${r.color}`}><r.icon size={18} className="text-white" /></div>
            <div>
              <div className="font-medium text-gray-900">{r.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{r.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">System Users</h2>
          <span className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <UsersIcon size={32} className="mx-auto mb-2 text-gray-300" />
            No users found. Use the "Add User" button to create accounts.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Created</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <User size={14} className="text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(u.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setConfirmDelete(u)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete user"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New User" size="sm">
        <UserForm
          onClose={() => setShowAdd(false)}
          onSave={(f) => createMutation.mutate(f)}
          loading={createMutation.isPending}
        />
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete User" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">This action cannot be undone.</p>
              <p className="text-sm text-red-600 mt-1">
                Are you sure you want to delete <strong>{confirmDelete?.full_name}</strong> ({confirmDelete?.email})?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              onClick={() => deleteMutation.mutate(confirmDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
