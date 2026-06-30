import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, CheckSquare, Square, Trash2, Mail, Phone, MapPin, Briefcase, RefreshCw, AlertCircle, Inbox, KanbanSquare, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import styles from './EmployeesPage.module.css'

type Task = {
  _id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
};

type EmployeeProgress = {
  applicationId: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  job: {
    title: string;
    category: string;
  };
  currentProject: string;
  tasks: Task[];
  phone: string;
  location: string;
  createdAt: string;
};

const DEPARTMENTS = ['All', 'Management', 'Engineering', 'HR', 'Marketing', 'Finance'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeProgress[]>([])
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  
  // Progress edit states
  const [projectEditValue, setProjectEditValue] = useState('')
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Load hired employees & progress records
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/employees/progress?t=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load employee records')
      const data = await response.json()
      setEmployees(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err: any) {
      console.error('Error fetching progress:', err)
      setError(err.message || 'Could not load employees records.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh polling
  useEffect(() => {
    void load()

    const intervalId = window.setInterval(() => {
      void load()
    }, 5000)

    const handleFocus = () => {
      void load()
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleFocus)
    }
  }, [load])

  // Filtered employees listing
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (selectedDept === 'All') return true
      return emp.job.category.toLowerCase().includes(selectedDept.toLowerCase())
    })
  }, [employees, selectedDept])

  // Auto-select first employee in list if none selected
  useEffect(() => {
    if (filteredEmployees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(filteredEmployees[0].applicationId)
    } else if (filteredEmployees.length === 0) {
      setSelectedEmployeeId(null)
    }
  }, [filteredEmployees, selectedEmployeeId])

  // Current active employee record
  const activeEmployee = useMemo(() => {
    return employees.find(e => e.applicationId === selectedEmployeeId) || null
  }, [employees, selectedEmployeeId])

  // Reset project edit field when active employee changes
  useEffect(() => {
    if (activeEmployee) {
      setProjectEditValue(activeEmployee.currentProject)
      setIsEditingProject(false)
    }
  }, [activeEmployee])

  // Post update helper
  const updateProgress = async (body: any) => {
    try {
      const response = await fetch('/api/admin/employees/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: selectedEmployeeId, ...body })
      })
      if (!response.ok) throw new Error('Failed to update employee progress')
      await load()
    } catch (err) {
      alert('Error updating progress records.')
    }
  }

  // Update current project title
  const handleSaveProject = async () => {
    const trimmed = projectEditValue.trim()
    if (!trimmed) return
    await updateProgress({ currentProject: trimmed })
    setIsEditingProject(false)
  }

  // Add new checklist task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTaskText.trim()
    if (!trimmed) return
    await updateProgress({ newTaskText: trimmed })
    setNewTaskText('')
  }

  // Toggle task completion checkbox
  const handleToggleTask = async (taskId: string) => {
    await updateProgress({ toggleTaskId: taskId })
  }

  // Delete task from checklist
  const handleDeleteTask = async (taskId: string) => {
    await updateProgress({ deleteTaskId: taskId })
  }

  // Calculate task percentage
  const calculateProgressStats = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return { percent: 0, completed: 0, total: 0 }
    const completed = tasks.filter(t => t.completed).length
    const total = tasks.length
    const percent = Math.round((completed / total) * 100)
    return { percent, completed, total }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Employees & Interns</h1>
          <p className={styles.subtitle}>Track active project status, pending tasks, and completion metrics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Sync: {format(lastUpdated, 'h:mm:ss a')}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={load} disabled={loading} title="Sync Records">
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="card flex items-center gap-3 mb-6" style={{ borderColor: 'var(--color-danger)', background: 'hsl(0, 72%, 51%, 0.05)' }}>
          <AlertCircle className="text-danger" size={20} />
          <div className="text-sm text-secondary">{error}</div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.toolbar}>
        {DEPARTMENTS.map(dept => (
          <button
            key={dept}
            className={`${styles.tabBtn} ${selectedDept === dept ? styles.activeTabBtn : ''}`}
            onClick={() => {
              setSelectedDept(dept);
              setSelectedEmployeeId(null); // Auto-select first in new category
            }}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Layout Grid */}
      {employees.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={42} strokeWidth={1.5} />
          <div className={styles.emptyText}>No employees marked as "Hired" in database. Shortlist and Hire candidates from the Applicants section first.</div>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Left Sidebar employee list */}
          <div className={styles.sidebarList}>
            {filteredEmployees.length === 0 ? (
              <div className={styles.emptyState} style={{ padding: '2rem 0' }}>
                <Inbox size={24} strokeWidth={1.5} />
                <div className={styles.emptyText} style={{ fontSize: '12px' }}>No active hires in this category</div>
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const stats = calculateProgressStats(emp.tasks)
                return (
                  <div
                    key={emp.applicationId}
                    className={`${styles.employeeCard} ${selectedEmployeeId === emp.applicationId ? styles.activeEmployeeCard : ''}`}
                    onClick={() => setSelectedEmployeeId(emp.applicationId)}
                  >
                    <div className={styles.avatar}>
                      {emp.user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                    </div>
                    <div className={styles.employeeInfo}>
                      <div className={styles.employeeName}>{emp.user.name}</div>
                      <div className={styles.employeeRole}>{emp.job.title}</div>
                      {/* Sub progress line */}
                      <div className={styles.progressBarContainer} style={{ marginTop: '0.2rem' }}>
                        <div className={styles.progressBarOutline} style={{ height: '4px' }}>
                          <div className={styles.progressBarFill} style={{ width: `${stats.percent}%` }} />
                        </div>
                        <span style={{ fontSize: '10px' }}>{stats.percent}%</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Right detail checklist panel */}
          {activeEmployee ? (
            <div className={styles.detailSection}>
              {/* Profile Card Header */}
              <div className={styles.detailHeader}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className={styles.avatar} style={{ width: '64px', height: '64px', fontSize: '24px' }}>
                    {activeEmployee.user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{activeEmployee.user.name}</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      💼 {activeEmployee.job.title} ({activeEmployee.job.category})
                    </p>
                    
                    <div className={styles.metaInfo}>
                      <span className={styles.metaItem}>
                        <Mail size={11} /> {activeEmployee.user.email}
                      </span>
                      <span className={styles.metaItem}>
                        <Phone size={11} /> {activeEmployee.phone}
                      </span>
                      <span className={styles.metaItem}>
                        <MapPin size={11} /> {activeEmployee.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="badge badge-success">HIRED</div>
              </div>

              {/* Current Project Board */}
              <div className={styles.projectTracker}>
                <span className={styles.projectLabel}>Current Project Workspace</span>
                
                {isEditingProject ? (
                  <div className={styles.projectInputWrapper}>
                    <input
                      type="text"
                      className={styles.projectInput}
                      value={projectEditValue}
                      onChange={(e) => setProjectEditValue(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleSaveProject}>Save</button>
                    <button className="btn btn-ghost" onClick={() => setIsEditingProject(false)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--foreground)' }}>
                      📁 {activeEmployee.currentProject}
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingProject(true)}>
                      Change Project
                    </button>
                  </div>
                )}

                {/* Progress Indicators */}
                {activeEmployee.tasks.length > 0 && (
                  <div>
                    <div className={styles.progressBarContainer}>
                      <span className={styles.projectLabel} style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                        Tasks Completion Summary:
                      </span>
                      <div className={styles.progressBarOutline}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${calculateProgressStats(activeEmployee.tasks).percent}%` }}
                        />
                      </div>
                      <span>
                        {calculateProgressStats(activeEmployee.tasks).percent}% ({calculateProgressStats(activeEmployee.tasks).completed}/{calculateProgressStats(activeEmployee.tasks).total})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tasks List Board */}
              <div className={styles.tasksContainer}>
                <span className={styles.projectLabel}>Workspace Checklist & Progress Tasks</span>

                <div className={styles.tasksList}>
                  {activeEmployee.tasks.length === 0 ? (
                    <div className={styles.emptyState} style={{ padding: '2rem 0' }}>
                      <CheckCircle size={28} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                      <div className={styles.emptyText} style={{ fontSize: 'var(--text-sm)' }}>Checklist is empty. Assign onboarding or project tasks below.</div>
                    </div>
                  ) : (
                    activeEmployee.tasks.map((task) => (
                      <div key={task._id} className={styles.taskItem}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: 'pointer' }}
                          onClick={() => handleToggleTask(task._id)}
                        >
                          {task.completed ? (
                            <CheckSquare size={16} className="text-success" />
                          ) : (
                            <Square size={16} className="text-muted" />
                          )}
                          <span className={`${styles.taskContent} ${task.completed ? styles.taskCompleted : ''}`}>
                            {task.text}
                          </span>
                        </div>
                        <button
                          className={styles.taskDeleteBtn}
                          onClick={() => handleDeleteTask(task._id)}
                          title="Remove task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Task input */}
                <form onSubmit={handleAddTask} className={styles.addTaskForm}>
                  <input
                    required
                    type="text"
                    placeholder="Enter project task description..."
                    className={styles.addTaskInput}
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Plus size={14} /> Add Task
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className={styles.detailSection} style={{ alignItems: 'center', justifyContent: 'center' }}>
              <KanbanSquare size={42} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
              <div className={styles.emptyText}>Select an employee/intern from the list to view their progress dashboard</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
