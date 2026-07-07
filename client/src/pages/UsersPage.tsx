import { useState, useEffect } from 'react'
import { Plus, Users, Activity, Loader2 } from 'lucide-react'
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

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'hr' })
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, logsRes] = await Promise.all([
        fetch('http://localhost:3001/api/users'),
        fetch('http://localhost:3001/api/users/logs')
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
      const res = await fetch('http://localhost:3001/api/users', {
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

      <div className={styles.tabs}>
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
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td><div className="fw-500 text-color">{u.name}</div></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-default'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem', color: 'red' }}>{modalError}</div>}
                
                <div className="form-group">
                  <label className="label">Name</label>
                  <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                
                <div className="form-group">
                  <label className="label">Email</label>
                  <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="label">Password</label>
                  <input type="text" className="input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label className="label">Role</label>
                  <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="hr">HR</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
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
