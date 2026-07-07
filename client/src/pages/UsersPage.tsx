import { useState, useEffect } from 'react'
import { Plus, Users, Activity, Loader2, Trash2, Filter } from 'lucide-react'
import styles from './UsersPage.module.css'

interface User {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface LoginLog {
  _id: string
  email: string
  role: string
  ipAddress: string
  userAgent: string
  status: string
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'users' | 'logs'>('users')
  const [roleFilter, setRoleFilter] = useState('all')

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'hr' })
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3001' : '';

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/users`),
        fetch(`${API_URL}/api/users/logs`)
      ])
      
      if (usersRes.ok) setUsers(await usersRes.json())
      if (logsRes.ok) setLogs(await logsRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')
      
      setShowModal(false)
      setFormData({ name: '', email: '', password: '', role: 'hr' })
      fetchData()
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting user');
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Staff</h1>
          <p className="page-subtitle">Manage admin and sub-user accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className={styles.tabs} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`${styles.tab} ${view === 'users' ? styles.active : ''}`}
            onClick={() => setView('users')}
          >
            <Users size={16} /> Users
          </button>
          <button 
            className={`${styles.tab} ${view === 'logs' ? styles.active : ''}`}
            onClick={() => setView('logs')}
          >
            <Activity size={16} /> Login History
          </button>
        </div>
        
        {view === 'users' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} className="text-muted" />
            <select 
              className="input" 
              style={{ padding: '0.25rem 0.5rem', width: 'auto', minWidth: '120px' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
              <option value="employee">Employee</option>
              <option value="candidate">Candidate</option>
            </select>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : view === 'users' ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => roleFilter === 'all' || (u.role && u.role.toLowerCase() === roleFilter.toLowerCase())).map(u => (
                  <tr key={u._id}>
                    <td><div className="fw-500 text-color">{u.name}</div></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role && u.role.toLowerCase() === 'admin' ? 'badge-primary' : 'badge-default'}`}>
                        {u.role ? u.role.toUpperCase() : ''}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(u._id, u.name)}
                        className="btn btn-ghost btn-icon" 
                        style={{ color: '#ef4444', padding: '4px' }}
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id}>
                    <td className="text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="fw-500">{log.email}</td>
                    <td>
                      <span className={`badge ${log.status === 'Success' ? 'badge-success' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>{log.ipAddress}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.userAgent}>
                      {log.userAgent}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No login logs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#111827', fontSize: '1.5rem', fontWeight: 600 }}>Create New User</h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} style={{ color: '#6b7280', fontSize: '1.5rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem', color: 'red' }}>{modalError}</div>}
                
                <div className="form-group">
                  <label className="label" style={{ color: '#1f2937', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>Name</label>
                  <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ border: '1px solid #ccc', color: '#000', backgroundColor: '#fff' }} />
                </div>
                
                <div className="form-group">
                  <label className="label" style={{ color: '#1f2937', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>Email</label>
                  <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ border: '1px solid #ccc', color: '#000', backgroundColor: '#fff' }} />
                </div>

                <div className="form-group">
                  <label className="label" style={{ color: '#1f2937', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>Password</label>
                  <input type="text" className="input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required style={{ border: '1px solid #ccc', color: '#000', backgroundColor: '#fff' }} />
                </div>

                <div className="form-group">
                  <label className="label" style={{ color: '#1f2937', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>Role</label>
                  <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ border: '1px solid #ccc', color: '#000', backgroundColor: '#fff' }}>
                    <option value="hr">HR</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
