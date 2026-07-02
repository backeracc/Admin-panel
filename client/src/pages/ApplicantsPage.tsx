import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Mail, Phone, ExternalLink, FileText, Download, User, MapPin, Briefcase, DollarSign, Clock, X, AlertCircle, RefreshCw, Inbox, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import styles from './ApplicantsPage.module.css'

type Note = { id: string; note: string };

type AppRow = {
  id: string;
  phone: string;
  resume: string;
  linkedin: string;
  github: string;
  portfolio?: string | null;
  status: "PENDING" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED";
  createdAt: string;
  user: { name: string; email: string };
  job: { title: string; category: string };
  notes: Note[];
  location?: string | null;
  yearsExperience?: string | null;
  currentCompany?: string | null;
  expectedSalary?: string | null;
  coverLetter?: string | null;
  customAnswers?: { question: string; answer: string }[];
};

const statusOptions = ["PENDING", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"] as const;


function CandidateProfileModal({
  selected,
  setSelected,
  load,
  handleAddNoteBase
}: {
  selected: AppRow;
  setSelected: (app: AppRow | null) => void;
  load: () => Promise<void>;
  handleAddNoteBase: (note: string) => Promise<void>;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    applicantName: selected.user?.name || "",
    applicantEmail: selected.user?.email || "",
    phone: selected.phone || "",
    location: selected.location || "",
    yearsExperience: selected.yearsExperience || "",
    currentCompany: selected.currentCompany || "",
    expectedSalary: selected.expectedSalary || "",
    linkedin: selected.linkedin || "",
    github: selected.github || "",
    portfolio: selected.portfolio || "",
    coverLetter: selected.coverLetter || ""
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    setIsSavingNote(true);
    await handleAddNoteBase(noteDraft);
    setNoteDraft("");
    setIsSavingNote(false);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update details");
      }
      const data = await res.json();
      
      // Update selected with new details
      const updatedUser = { ...selected.user, name: editForm.applicantName, email: editForm.applicantEmail };
      setSelected({
        ...selected,
        user: updatedUser,
        phone: editForm.phone,
        location: editForm.location,
        yearsExperience: editForm.yearsExperience,
        currentCompany: editForm.currentCompany,
        expectedSalary: editForm.expectedSalary,
        linkedin: editForm.linkedin,
        github: editForm.github,
        portfolio: editForm.portfolio,
        coverLetter: editForm.coverLetter
      });
      setIsEditing(false);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to save details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={() => setSelected(null)}>
          <X size={18} />
        </button>

        {isEditing ? (
          <form onSubmit={handleSaveDetails} className="p-2">
            <h3 className={styles.modalTitle} style={{ marginBottom: '1rem' }}>Edit Candidate Details</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold mb-1">Name</label>
                <input required className="w-full px-3 py-2 border rounded text-sm" value={editForm.applicantName} onChange={e => setEditForm({...editForm, applicantName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Email</label>
                <input required type="email" className="w-full px-3 py-2 border rounded text-sm" value={editForm.applicantEmail} onChange={e => setEditForm({...editForm, applicantEmail: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Phone</label>
                <input required className="w-full px-3 py-2 border rounded text-sm" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Location</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Years Experience</label>
                <input type="number" className="w-full px-3 py-2 border rounded text-sm" value={editForm.yearsExperience} onChange={e => setEditForm({...editForm, yearsExperience: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Current Company</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.currentCompany} onChange={e => setEditForm({...editForm, currentCompany: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Expected Salary</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.expectedSalary} onChange={e => setEditForm({...editForm, expectedSalary: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold mb-1">LinkedIn</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.linkedin} onChange={e => setEditForm({...editForm, linkedin: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">GitHub</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.github} onChange={e => setEditForm({...editForm, github: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Portfolio</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.portfolio} onChange={e => setEditForm({...editForm, portfolio: e.target.value})} />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1">Cover Letter</label>
              <textarea className="w-full px-3 py-2 border rounded text-sm" rows={4} value={editForm.coverLetter} onChange={e => setEditForm({...editForm, coverLetter: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSavingDetails}>{isSavingDetails ? 'Saving...' : 'Save Details'}</button>
            </div>
          </form>
        ) : (
          <>
            {/* Profile Header */}
            <div className={styles.candidateHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 className={styles.modalTitle}>Candidate Profile</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>Edit Details</button>
              </div>
              <p style={{ marginTop: '0.4rem', fontSize: 'var(--text-sm)' }}>
                <strong>{selected.user?.name || 'Candidate'}</strong> • {selected.user?.email} • {selected.phone}
              </p>
              
              {/* Social Links */}
              <div className={styles.candidateLinks}>
                <a className={styles.linkItem} href={selected.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn <ExternalLink size={11} />
                </a>
                <a className={styles.linkItem} href={selected.github} target="_blank" rel="noopener noreferrer">
                  GitHub <ExternalLink size={11} />
                </a>
                {selected.portfolio && (
                  <a className={styles.linkItem} href={selected.portfolio} target="_blank" rel="noopener noreferrer">
                    Portfolio <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>

            {/* Resume Links */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <a
                className={styles.linkItem}
                href={`/api/admin/applications/${selected.id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText size={13} /> Preview Resume
              </a>
              <a
                className={styles.linkItem}
                href={`/api/admin/applications/${selected.id}/resume?download=1`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={13} /> Download Resume File
              </a>
            </div>

            {/* Candidate Metadata Details */}
            <div className={styles.detailsGrid}>
              <div>
                <span className={styles.detailLabel}>📍 Current Location:</span>
                <div style={{ marginTop: '0.15rem' }}>{selected.location || "—"}</div>
              </div>
              <div>
                <span className={styles.detailLabel}>⏱ Experience:</span>
                <div style={{ marginTop: '0.15rem' }}>{selected.yearsExperience ? `${selected.yearsExperience} Year(s)` : "—"}</div>
              </div>
              <div>
                <span className={styles.detailLabel}>🏢 Current Company:</span>
                <div style={{ marginTop: '0.15rem' }}>{selected.currentCompany || "—"}</div>
              </div>
              <div>
                <span className={styles.detailLabel}>💵 Expected Salary:</span>
                <div style={{ marginTop: '0.15rem' }}>{selected.expectedSalary ? `₹ ${selected.expectedSalary}` : "—"}</div>
              </div>
            </div>

            {/* Custom Answers */}
            {selected.customAnswers && selected.customAnswers.length > 0 && (
              <div className={styles.coverLetterSection}>
                <span className={styles.sectionTitle}>Application Questions</span>
                <div className={styles.coverLetterContent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selected.customAnswers.map((ca, i) => (
                    <div key={i}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Q: {ca.question}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>A: {ca.answer || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cover Letter */}
            <div className={styles.coverLetterSection}>
              <span className={styles.sectionTitle}>Cover Letter</span>
              <div className={styles.coverLetterContent}>
                {selected.coverLetter || "—"}
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className={styles.notesSection}>
              <span className={styles.sectionTitle}>Recruiter Internal Notes</span>
              
              <div className={styles.notesList}>
                {selected.notes.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No notes added yet for this candidate.</p>
                ) : (
                  selected.notes.map((n) => (
                    <div key={n.id} className={styles.noteItem}>
                      • {n.note}
                    </div>
                  ))
                )}
              </div>

              {/* Note Submission Form */}
              <form className={styles.noteForm} onSubmit={handleAddNote}>
                <input
                  required
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className={styles.noteInput}
                  placeholder="Write a recruiter note about this candidate..."
                  disabled={isSavingNote}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingNote || !noteDraft.trim()}
                >
                  {isSavingNote ? 'Saving...' : 'Add Note'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ApplicantsPage() {

  const [applications, setApplications] = useState<AppRow[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selected, setSelected] = useState<AppRow | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Fetch applications from server
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/applications?t=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) throw new Error('Failed to load applications')
      const data = await response.json()
      setApplications(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err: any) {
      console.error('Error loading applications:', err)
      setError(err.message || 'Could not load applications from backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh lifecycle
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

  // Sync selected candidate inside modal if the list updates
  useEffect(() => {
    if (!selected) return
    const updated = applications.find(a => a.id === selected.id)
    if (updated) {
      setSelected(updated)
    }
  }, [applications, selected])

  // Derived filter list
  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase()
    return applications.filter((a) => {
      const matchesQ = !q ||
        a.user.name.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        a.job.title.toLowerCase().includes(q)
      
      const matchesS = !statusFilter || a.status === statusFilter
      return matchesQ && matchesS
    })
  }, [applications, query, statusFilter])

  // Update applicant status
  const handleStatusChange = async (app: AppRow, nextStatus: AppRow["status"]) => {
    // Optimistic UI update
    const previousApplications = [...applications]
    setApplications((prev) =>
      prev.map((row) => (row.id === app.id ? { ...row, status: nextStatus } : row))
    )

    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update status")
      }

      // Shortlisting success/warning feedback
      if (nextStatus === "SHORTLISTED") {
        if (payload?.mailWarning) {
          alert(`${payload.mailWarning}\nEmail provider debug logs will contain more info.`);
        } else {
          const provider = payload?.mailReport?.provider ? ` via ${payload.mailReport.provider}` : ""
          alert(`Shortlist notification email sent successfully${provider} to ${app.user.email}.`)
        }
      }

      await load()
    } catch (err: any) {
      alert(err.message || 'An error occurred while updating status.')
      // Rollback on error
      setApplications(previousApplications)
      await load()
    }
  }

  // Add notes handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    
    const note = noteDraft.trim()
    if (!note) return

    setIsSavingNote(true)
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || "Failed to add note")
      }

      setNoteDraft("")
      // Optimistic note append
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              notes: [...prev.notes, { id: `tmp-${Date.now()}`, note }]
            }
          : prev
      )
      
      await load()
    } catch (err: any) {
      alert(err.message || 'Failed to save note.')
    } finally {
      setIsSavingNote(false)
    }
  }

  const getBadgeClass = (status: AppRow["status"]) => {
    switch (status) {
      case 'HIRED': return styles.badge_hired
      case 'SHORTLISTED': return styles.badge_shortlisted
      case 'REVIEWING': return styles.badge_reviewing
      case 'REJECTED': return styles.badge_rejected
      case 'PENDING':
      default: return styles.badge_pending
    }
  }

  return (
    <div className="fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Applicants</h1>
          <p className={styles.subtitle}>Review candidate applications and shortlist matches</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Sync: {format(lastUpdated, 'h:mm:ss a')}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={load} disabled={loading} title="Sync Applicants">
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

      {/* Toolbar filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchInputWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search candidate, email, role..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Applications Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrap}>
          {filteredApplications.length === 0 ? (
            <div className={styles.emptyState}>
              <Inbox size={36} strokeWidth={1.5} />
              <div className={styles.emptyText}>No applications found matching filters</div>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Field</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Resume</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div className={styles.candidateCell}>
                        <span className={styles.candidateName}>{app.user?.name || 'Unknown Candidate'}</span>
                        <div className={styles.candidateSubtext}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Mail size={10} /> {app.user?.email || '—'}
                          </span>
                          <br />
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Phone size={10} /> {app.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <span className="badge badge-muted">{app.job?.category || 'General'}</span>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontWeight: 500 }}>
                      {app.job?.title || 'General Position'}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <span className={`${styles.badge} ${getBadgeClass(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <a
                        href={`/api/admin/applications/${app.id}/resume?download=1`}
                        className={styles.linkItem}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download candidate resume file"
                      >
                        <Download size={13} /> Download
                      </a>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div className={styles.actionsCell}>
                        <select
                          className={styles.statusDropdown}
                          value={app.status}
                          onChange={(e) => handleStatusChange(app, e.target.value as AppRow["status"])}
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          className={styles.profileBtn}
                          onClick={() => { setSelected(app); setNoteDraft(""); }}
                        >
                          Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Candidate Profile Modal */}
      {selected && (
        <CandidateProfileModal
          selected={selected}
          setSelected={setSelected}
          load={load}
          handleAddNoteBase={async (note) => {
            const res = await fetch(`/api/admin/applications/${selected.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ note }),
            });
            if (!res.ok) {
              const payload = await res.json().catch(() => null);
              throw new Error(payload?.error || "Failed to add note");
            }
            setSelected((prev) =>
              prev
                ? {
                    ...prev,
                    notes: [...prev.notes, { id: `tmp-${Date.now()}`, note }]
                  }
                : prev
            );
            await load();
          }}
        />
      )}

    </div>
  )
}
