'use client'

import { useState, useEffect } from 'react'
import DetailModal, { DetailRow } from '@/components/DetailModal'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getPasswordStrength } from '@/lib/validation'

interface Settings {
  shop_name: string
  shop_address: string
  shop_city: string
  shop_state: string
  shop_zip: string
  shop_phone: string
  shop_email: string
  tax_rate: string
  currency: string
  ticket_prefix: string
  quote_prefix: string
  sale_prefix: string
  order_prefix: string
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  phone: string | null
  createdAt?: string
}

const roleOptions = ['ADMIN', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST']

export default function SettingsPage() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('shop')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    shop_name: '',
    shop_address: '',
    shop_city: '',
    shop_state: '',
    shop_zip: '',
    shop_phone: '',
    shop_email: '',
    tax_rate: '8.625',
    currency: 'USD',
    ticket_prefix: 'TKT',
    quote_prefix: 'QT',
    sale_prefix: 'INV',
    order_prefix: 'PO',
  })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'TECHNICIAN',
    phone: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [settingsRes, usersRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/users'),
      ])
      const [settingsData, usersData] = await Promise.all([
        settingsRes.json(),
        usersRes.json(),
      ])

      if (settingsData.success) {
        setSettings(prev => ({ ...prev, ...settingsData.data.settings }))
      }
      if (usersData.success) {
        setUsers(usersData.data.users)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Settings saved successfully!', 'success')
      } else {
        showToast(data.error || 'Failed to save settings', 'error')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      showToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setNewUser({
        email: user.email,
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone || '',
      })
    } else {
      setEditingUser(null)
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'TECHNICIAN',
        phone: '',
      })
    }
    setShowUserModal(true)
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setEditingUser(null)
    setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'TECHNICIAN', phone: '' })
  }

  const handleSaveUser = async () => {
    setSaving(true)
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      // Don't send password if editing and no new password provided
      const userData = editingUser && !newUser.password
        ? { ...newUser, password: undefined }
        : newUser

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const data = await res.json()
      if (data.success) {
        fetchData()
        closeUserModal()
        showToast(editingUser ? 'User updated successfully!' : 'User created successfully!', 'success')
      } else {
        showToast(data.error || 'Failed to save user', 'error')
      }
    } catch (error) {
      console.error('Failed to save user:', error)
      showToast('Failed to save user', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setDeleteConfirm(userId)
  }

  const confirmDeleteUser = async () => {
    if (!deleteConfirm) return
    try {
      const res = await fetch(`/api/users/${deleteConfirm}`, { method: 'DELETE' })
      if (res.ok) {
        fetchData()
        setSelectedUser(null)
        showToast('User deleted successfully', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to delete user', 'error')
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      showToast('Failed to delete user', 'error')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Password changed successfully!', 'success')
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        showToast(data.error || 'Failed to change password', 'error')
      }
    } catch {
      showToast('Failed to change password', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleRowClick = (user: User) => {
    setSelectedUser(user)
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      MANAGER: 'bg-blue-100 text-blue-800',
      TECHNICIAN: 'bg-green-100 text-green-800',
      RECEPTIONIST: 'bg-gray-100 text-gray-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your shop settings and users</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {['shop', 'users', 'security', 'services'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'shop' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Shop Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                <input
                  type="text"
                  value={settings.shop_name}
                  onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={settings.shop_address}
                  onChange={(e) => setSettings({ ...settings, shop_address: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={settings.shop_city}
                  onChange={(e) => setSettings({ ...settings, shop_city: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={settings.shop_state}
                    onChange={(e) => setSettings({ ...settings, shop_state: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={settings.shop_zip}
                    onChange={(e) => setSettings({ ...settings, shop_zip: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={settings.shop_phone}
                  onChange={(e) => setSettings({ ...settings, shop_phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={settings.shop_email}
                  onChange={(e) => setSettings({ ...settings, shop_email: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Business Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="select-field"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Number Prefixes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Prefix</label>
                <input
                  type="text"
                  value={settings.ticket_prefix}
                  onChange={(e) => setSettings({ ...settings, ticket_prefix: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quote Prefix</label>
                <input
                  type="text"
                  value={settings.quote_prefix}
                  onChange={(e) => setSettings({ ...settings, quote_prefix: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.sale_prefix}
                  onChange={(e) => setSettings({ ...settings, sale_prefix: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Prefix</label>
                <input
                  type="text"
                  value={settings.order_prefix}
                  onChange={(e) => setSettings({ ...settings, order_prefix: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSaveSettings} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Users</h3>
            <button onClick={() => openUserModal()} className="btn-primary text-sm">
              Add User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(user)}
                  >
                    <td className="table-cell font-medium">{user.firstName} {user.lastName}</td>
                    <td className="table-cell">{user.email}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell">{user.phone || '-'}</td>
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openUserModal(user)} className="text-primary-600 hover:text-primary-700">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card max-w-lg">
          <h3 className="font-semibold mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="input-field"
              />
              {passwordForm.newPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${getPasswordStrength(passwordForm.newPassword).color} transition-all`} style={{ width: `${(getPasswordStrength(passwordForm.newPassword).score / 6) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{getPasswordStrength(passwordForm.newPassword).label}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="input-field"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="btn-primary"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="card">
          <h3 className="font-semibold mb-4">Service Management</h3>
          <p className="text-gray-600">Service pricing can be managed in the Services section. Use this area to configure service categories and default pricing templates.</p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Coming soon: Service category management, pricing templates, and labor rate configuration.</p>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeUserModal}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input-field"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="select-field"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeUserModal} className="btn-secondary" disabled={saving}>Cancel</button>
              <button
                onClick={handleSaveUser}
                disabled={saving || !newUser.email || (!editingUser && !newUser.password) || !newUser.firstName}
                className="btn-primary"
              >
                {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteConfirm(null)}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* User Detail Modal */}
      <DetailModal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Details"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">
                  {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                </span>
              </div>
              <h4 className="text-xl font-bold text-gray-900">
                {selectedUser.firstName} {selectedUser.lastName}
              </h4>
              <span className={`inline-block mt-2 status-badge ${getRoleColor(selectedUser.role)}`}>
                {selectedUser.role}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <DetailRow label="Email" value={selectedUser.email} />
              <DetailRow label="Phone" value={selectedUser.phone || 'Not provided'} />
              <DetailRow label="Role" value={selectedUser.role} />
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => handleDeleteUser(selectedUser.id)}
                className="btn-secondary text-red-600 hover:bg-red-50"
              >
                Delete User
              </button>
              <div className="flex gap-3">
                <button onClick={() => setSelectedUser(null)} className="btn-secondary">
                  Close
                </button>
                <button
                  onClick={() => { setSelectedUser(null); openUserModal(selectedUser) }}
                  className="btn-primary"
                >
                  Edit User
                </button>
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
