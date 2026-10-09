import UserManagement from './components/UserManagement'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import ModulesAndCohorts from './components/ModulesAndCohorts'
import { loginUser, registerUser } from './services/auth.service'
import StudyMaterials from './Features/StudyMaterials'
import AIChat from './Features/AIChat'
import RevisionHub from './Features/RevisionHub'
import { useEffect, useState } from 'react'
import './App.css'

const emptyTask = {
  title: '',
  subject: '',
  date: '',
  time: '',
  priority: 'Medium',
  description: '',
}

const emptyAnnouncement = {
  title: '',
  message: '',
  category: 'General',
}

function getTaskStorageKey(email) {
  return `studysphere_tasks_${email.toLowerCase()}`
}

function loadTasks(email) {
  try {
    const storedTasks = JSON.parse(localStorage.getItem(getTaskStorageKey(email)) || '[]')
    return Array.isArray(storedTasks) ? storedTasks : []
  } catch {
    return []
  }
}

function saveTasks(email, tasksToSave) {
  try {
    localStorage.setItem(getTaskStorageKey(email), JSON.stringify(tasksToSave))
  } catch {
    // Task state still works for this session if browser storage is unavailable.
  }
}

function getAnnouncementStorageKey(email) {
  return `studysphere_announcements_${email.toLowerCase()}`
}

function loadAnnouncements(email) {
  try {
    const storedAnnouncements = JSON.parse(localStorage.getItem(getAnnouncementStorageKey(email)) || '[]')
    return Array.isArray(storedAnnouncements) ? sortAnnouncements(storedAnnouncements) : []
  } catch {
    return []
  }
}

function sortAnnouncements(announcementsToSort) {
  return [...announcementsToSort].sort((firstAnnouncement, secondAnnouncement) => (
    new Date(secondAnnouncement.publishedAt).getTime() - new Date(firstAnnouncement.publishedAt).getTime()
  ))
}

function saveAnnouncements(email, announcementsToSave) {
  try {
    localStorage.setItem(getAnnouncementStorageKey(email), JSON.stringify(announcementsToSave))
  } catch {
    // Announcement state still works for this session if browser storage is unavailable.
  }
}

function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem('studysphere_session') || 'null')
    const role = session?.user?.role?.toLowerCase()
    if (!session?.token || !session?.user || !['student', 'admin', 'administrator'].includes(role)) return null
    return { ...session, user: { ...session.user, role: role === 'administrator' ? 'admin' : role } }
  } catch {
    return null
  }
}

function saveSession(session) {
  try {
    localStorage.setItem('studysphere_session', JSON.stringify(session))
  } catch {
    // The in-memory session remains available if browser storage is unavailable.
  }
}

function clearSession() {
  try {
    localStorage.removeItem('studysphere_session')
  } catch {
    // Nothing else is needed when storage is unavailable.
  }
}

const dashboardEmptyState = {
  activeModules: { count: 0, cohortCount: 0, items: [] },
  upcomingDeadlines: { count: 0, items: [] },
  aiQuestionsThisWeek: { count: 0, weeklyLimit: 20 },
  recentDocuments: [],
  announcements: [],
}

async function loadDashboardData(token) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const response = await fetch(`${apiUrl}/dashboard`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Dashboard data could not be loaded.')
  const result = await response.json()
  return result.dashboard || dashboardEmptyState
}

async function refreshDashboardForUser(user) {
  if (!user) return dashboardEmptyState

  try {
    const session = loadSession()
    return await loadDashboardData(session?.token || '')
  } catch {
    return dashboardEmptyState
  }
}

function formatTaskDate(task) {
  if (!task.date) return 'No date set'
  const taskDate = new Date(`${task.date}T${task.time || '00:00'}`)
  if (Number.isNaN(taskDate.getTime())) return task.date
  return taskDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getTaskStatus(task) {
  if (task.completed) return 'completed'
  if (!task.date) return 'upcoming'

  const today = new Date()
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-')
  const taskDate = new Date(`${task.date}T${task.time || '23:59'}`)

  if (Number.isNaN(taskDate.getTime())) return 'upcoming'
  if (task.date === todayKey) return taskDate < today ? 'overdue' : 'today'
  return taskDate < today ? 'overdue' : 'upcoming'
}

function getTaskTimestamp(task) {
  const timestamp = new Date(`${task.date}T${task.time || '23:59'}`).getTime()
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

function sortTasksByDate(tasksToSort) {
  return [...tasksToSort].sort((firstTask, secondTask) => (
    getTaskTimestamp(firstTask) - getTaskTimestamp(secondTask)
  ))
}

function PlannerClock() {
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const dateText = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeText = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <div className="planner-clock" aria-live="polite">
      <span className="planner-clock-label">Today</span>
      <strong>{dateText}</strong>
      <time>{timeText}</time>
    </div>
  )
}

function TaskForm({ task, onSave, onCancel }) {
  const [formData, setFormData] = useState(task || emptyTask)
  const [formError, setFormError] = useState('')

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!formData.title.trim() || !formData.subject.trim() || !formData.date || !formData.time) {
      setFormError('Please complete the task title, subject, date, and time.')
      return
    }

    onSave({
      ...formData,
      title: formData.title.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim(),
    })
  }

  return (
    <div className="task-modal-backdrop" role="presentation">
      <form className="task-modal panel" onSubmit={handleSubmit}>
        <div className="task-modal-header">
          <div>
            <p className="form-kicker">STUDY PLANNER</p>
            <h2>{task ? 'Edit task' : 'Add task'}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onCancel} aria-label="Close task form">×</button>
        </div>

        <div className="task-form-grid">
          <label className="task-form-field task-form-field-wide">
            Task title
            <input type="text" value={formData.title} onChange={(event) => updateField('title', event.target.value)} autoFocus />
          </label>
          <label className="task-form-field">
            Subject
            <input type="text" value={formData.subject} onChange={(event) => updateField('subject', event.target.value)} />
          </label>
          <label className="task-form-field">
            Date
            <input type="date" value={formData.date} onChange={(event) => updateField('date', event.target.value)} />
          </label>
          <label className="task-form-field">
            Time
            <input type="time" value={formData.time} onChange={(event) => updateField('time', event.target.value)} />
          </label>
          <label className="task-form-field">
            Priority
            <select value={formData.priority} onChange={(event) => updateField('priority', event.target.value)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label className="task-form-field task-form-field-wide">
            Description
            <textarea value={formData.description} onChange={(event) => updateField('description', event.target.value)} rows="3" />
          </label>
        </div>

        {formError && <p className="task-form-error" role="alert">{formError}</p>}
        <div className="task-modal-actions">
          <button className="modal-secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="planner-button" type="submit">{task ? 'Save changes' : 'Save task'}</button>
        </div>
      </form>
    </div>
  )
}

function AnnouncementForm({ announcement, onSave, onCancel }) {
  const [formData, setFormData] = useState(announcement || emptyAnnouncement)
  const [formError, setFormError] = useState('')

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!formData.title.trim() || !formData.message.trim() || !formData.category) {
      setFormError('Please complete the title, message, and category.')
      return
    }

    onSave({
      ...formData,
      title: formData.title.trim(),
      message: formData.message.trim(),
    })
  }

  return (
    <div className="task-modal-backdrop" role="presentation">
      <form className="task-modal panel" onSubmit={handleSubmit}>
        <div className="task-modal-header">
          <div>
            <p className="form-kicker">ANNOUNCEMENTS</p>
            <h2>{announcement ? 'Edit announcement' : 'Add announcement'}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onCancel} aria-label="Close announcement form">×</button>
        </div>

        <div className="task-form-grid">
          <label className="task-form-field task-form-field-wide">
            Announcement title
            <input type="text" value={formData.title} onChange={(event) => updateField('title', event.target.value)} autoFocus />
          </label>
          <label className="task-form-field task-form-field-wide">
            Message
            <textarea value={formData.message} onChange={(event) => updateField('message', event.target.value)} rows="4" />
          </label>
          <label className="task-form-field task-form-field-wide">
            Category
            <select value={formData.category} onChange={(event) => updateField('category', event.target.value)}>
              <option>General</option>
              <option>Academic</option>
              <option>Campus</option>
              <option>Deadline</option>
            </select>
          </label>
        </div>

        {formError && <p className="task-form-error" role="alert">{formError}</p>}
        <div className="task-modal-actions">
          <button className="modal-secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="planner-button" type="submit">{announcement ? 'Save changes' : 'Publish announcement'}</button>
        </div>
      </form>
    </div>
  )
}

function TaskItem({ task, onEdit, onDelete, onToggle }) {
  const status = getTaskStatus(task)

  return (
    <li className="task-row">
      <div className="task-main">
        <button
          className={`checkbox ${task.completed ? 'checked' : ''}`}
          type="button"
          aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
          onClick={() => onToggle(task.id)}
        ></button>
        <div className="task-copy">
          <div className={`task-title ${task.completed ? 'completed' : ''}`}>{task.title}</div>
          <div className="task-subject">{task.subject}</div>
          <div className="task-date">{formatTaskDate(task)}{task.time ? ` • ${task.time}` : ''}</div>
          {task.description && <div className="task-description">{task.description}</div>}
        </div>
      </div>

      <div className="task-actions">
        <span className={`task-tag priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
        <span className={`task-status task-status-${status}`}>{status}</span>
        <button className="task-action-button" type="button" onClick={() => onEdit(task)}>Edit</button>
        <button className="task-action-button danger" type="button" onClick={() => onDelete(task.id)}>Delete</button>
      </div>
    </li>
  )
}

function formatAnnouncementDate(announcement) {
  const date = new Date(announcement.publishedAt)
  if (Number.isNaN(date.getTime())) return 'Publication time unavailable'
  return `Published: ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

function AnnouncementItem({ announcement, onEdit, onDelete, showActions = false }) {
  return (
    <article className="announcement-item">
      <span className="tag mint">{announcement.category}</span>
      <div className="announcement-copy">
        <strong>{announcement.title}</strong>
        <p>{announcement.message}</p>
        <small>{formatAnnouncementDate(announcement)}</small>
      </div>
      {showActions && (
        <div className="announcement-actions">
          <button className="task-action-button" type="button" onClick={() => onEdit(announcement)}>Edit</button>
          <button className="task-action-button danger" type="button" onClick={() => onDelete(announcement.id)}>Delete</button>
        </div>
      )}
    </article>
  )
}

function DashboardOverview({
  currentUser,
  sessionDate,
  dashboardData,
  onAddTask,
  upcomingTasks,
  todayTasks,
  pastTasks,
  onEditTask,
  onDeleteTask,
  onToggleTask,
}) {
  const { activeModules, upcomingDeadlines, aiQuestionsThisWeek, recentDocuments, announcements } = dashboardData
  const [currentTime] = useState(() => Date.now())
  const formatFileSize = (bytes) => bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  const formatDeadline = (dueAt) => new Date(dueAt).toLocaleString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <section className="dashboard-overview">
      <header className="dashboard-overview-header">
        <div>
          <p className="date-line">{sessionDate}</p>
          <h1>Welcome back, {currentUser.firstName}</h1>
        </div>
        <button className="planner-button" type="button" onClick={onAddTask}>
          <span className="plus">+</span> Add planner task
        </button>
      </header>

      <section className="dashboard-announcements panel">
        <h2>Announcements</h2>
        {announcements.length ? announcements.map((announcement) => (
          <article className="dashboard-announcement-row" key={announcement.id}>
            <span className={`dashboard-category-tag ${announcement.category === 'Campus-wide' ? 'campus' : 'module'}`}>
              {announcement.category}
            </span>
            <div>
              <strong>{announcement.title}</strong>
              <p>{announcement.message}</p>
            </div>
          </article>
        )) : <p className="dashboard-empty-state">No announcements right now.</p>}
      </section>

      <section className="dashboard-stats" aria-label="Study statistics">
        <article className="dashboard-stat-card panel">
          <h2>Active modules</h2>
          <strong>{activeModules.count}</strong>
          <p>Across {activeModules.cohortCount} cohort{activeModules.cohortCount === 1 ? '' : 's'}</p>
        </article>
        <article className="dashboard-stat-card panel">
          <h2>Upcoming deadlines</h2>
          <strong>{upcomingDeadlines.count}</strong>
          <p>{upcomingDeadlines.items.filter((item) => (new Date(item.dueAt).getTime() - currentTime) <= 48 * 60 * 60 * 1000).length} due within 48 hours</p>
        </article>
        <article className="dashboard-stat-card panel">
          <h2>AI questions this week</h2>
          <strong>{aiQuestionsThisWeek.count}</strong>
          <p>of {aiQuestionsThisWeek.weeklyLimit} weekly limit</p>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-list-card panel">
          <div className="dashboard-card-heading"><h2>Upcoming deadlines</h2><span>{upcomingDeadlines.count}</span></div>
          {upcomingDeadlines.items.length ? upcomingDeadlines.items.map((deadline) => (
            <div className="dashboard-deadline-row" key={deadline.id}>
              <span className={`dashboard-deadline-icon ${deadline.type}`}>{deadline.type.charAt(0).toUpperCase()}</span>
              <div className="dashboard-list-copy"><strong>{deadline.module ? `${deadline.module} — ` : ''}{deadline.title}</strong><small>Due {formatDeadline(deadline.dueAt)}</small></div>
              <span className={`dashboard-status-pill ${deadline.type}`}>{deadline.type}</span>
            </div>
          )) : <p className="dashboard-empty-state">You&apos;re all caught up.</p>}
        </article>

        <article className="dashboard-list-card panel">
          <div className="dashboard-card-heading"><h2>Recent documents</h2><span>{recentDocuments.length}</span></div>
          {recentDocuments.length ? recentDocuments.map((document) => (
            <div className="dashboard-document-row" key={document.id}>
              <span className={`dashboard-file-icon ${document.fileType.toLowerCase()}`}>{document.fileType.toUpperCase()}</span>
              <div className="dashboard-list-copy"><strong>{document.fileName}</strong><small>{document.module || 'Unassigned module'} · {formatFileSize(document.fileSizeBytes)}</small></div>
              <span className="dashboard-comment-icon" aria-hidden="true">▢</span>
            </div>
          )) : <p className="dashboard-empty-state">No documents yet.</p>}
        </article>
      </section>

      <section className="dashboard-task-grid">
        <div className="task-panel panel">
          <div className="section-heading-row"><h2>Upcoming tasks</h2><span className="section-count">{upcomingTasks.length}</span></div>
          {upcomingTasks.length ? <ul className="task-list">{upcomingTasks.map((task) => <TaskItem key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} onToggle={onToggleTask} />)}</ul> : <div className="empty-state"><strong>No upcoming tasks</strong><p>Add a study task to start planning.</p></div>}
        </div>
        <div className="task-panel panel">
          <div className="section-heading-row"><h2>Today&apos;s tasks</h2><span className="section-count">{todayTasks.length}</span></div>
          {todayTasks.length ? <ul className="task-list">{todayTasks.map((task) => <TaskItem key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} onToggle={onToggleTask} />)}</ul> : <div className="empty-state"><strong>No tasks scheduled for today.</strong><p>Your day is clear.</p></div>}
        </div>
        {pastTasks.length > 0 && <div className="task-panel panel past-task-panel"><div className="section-heading-row"><h2>Past tasks</h2><span className="section-count">{pastTasks.length}</span></div><ul className="task-list">{pastTasks.map((task) => <TaskItem key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} onToggle={onToggleTask} />)}</ul></div>}
      </section>
    </section>
  )
}

function SuccessNotice({ message }) {
  if (!message) return null

  return <div className="success-notice" role="status">{message}</div>
}

export function Login({ onLogin, onRegister, successMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const nextErrors = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    setEmail(normalizedEmail)

    if (!normalizedEmail) {
      nextErrors.email = 'Email is required'
    } else if (!emailPattern.test(normalizedEmail)) {
      nextErrors.email = 'Please enter a valid email address'
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      const authResponse = await loginUser({
        email: normalizedEmail,
        password,
      })
      onLogin(authResponse)
    } catch (error) {
      setErrors({ form: error.message || 'Unable to log in. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <SuccessNotice message={successMessage} />
      <section className="login-brand-panel" aria-label="StudySphere introduction">
        <div className="login-brand-copy">
          <div className="login-wordmark">
            <span className="login-wordmark-mark">S</span>
            <span>StudySphere</span>
          </div>
          <div className="login-brand-text">
            <p className="login-eyebrow">STUDENT PORTAL</p>
            <h1>Make every study hour count.</h1>
            <p>Organise your learning, stay on top of deadlines, and move forward with confidence.</p>
          </div>
        </div>

        <div className="login-decoration" aria-hidden="true">
          <span className="login-orbit login-orbit-one"></span>
          <span className="login-orbit login-orbit-two"></span>
          <span className="login-decoration-card login-decoration-card-one">03</span>
          <span className="login-decoration-card login-decoration-card-two">Focus</span>
        </div>
      </section>

      <section className="login-form-panel">
        <form className="login-card panel" onSubmit={handleSubmit} noValidate>
          <div className="login-form-heading">
            <p className="login-form-kicker">WELCOME BACK</p>
            <h1>Welcome to StudySphere</h1>
            <p className="login-subtitle">Sign in to continue your study journey.</p>
          </div>

          <label className="login-field">
            Email / Username
            <span className="login-input-wrap">
              <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                <path d="m4.5 7 7.5 5.5L19.5 7" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </span>
            {errors.email && <span className="login-error" role="alert">{errors.email}</span>}
          </label>

          <label className="login-field">
            Password
            <span className="login-input-wrap">
              <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {showPassword ? <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.5 4.8 8.5 7s-3.3 7-8.5 7c-1.5 0-2.8-.3-4-.8M5.2 7.1C3.4 8.5 2.5 10.4 2.5 12c0 1 1 2.8 2.7 4.5" /> : <><path d="M2.5 12S5.8 5 12 5s9.5 7 9.5 7-3.3 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></>}
                </svg>
              </button>
            </span>
            {errors.password && <span className="login-error" role="alert">{errors.password}</span>}
          </label>

          {errors.form && <p className="login-error" role="alert">{errors.form}</p>}
          <button className="planner-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>
          <p className="auth-switch">Don&apos;t have an account? <button type="button" onClick={onRegister}>Register</button></p>
          <p className="login-footer">StudySphere · Student Portal</p>
        </form>
      </section>
    </main>
  )
}

export function Registration({ onSignIn }) {
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    studentNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    cohortId: '',
    cohortSearch: '',
    role: '',
  })
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [cohorts, setCohorts] = useState([])
  const [isLoadingCohorts, setIsLoadingCohorts] = useState(true)
  const [cohortLoadError, setCohortLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

    async function loadCohorts() {
      try {
        const response = await fetch(`${apiUrl}/cohorts/public`)
        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(result.message || 'Unable to load cohorts.')
        }

        if (!cancelled) {
          setCohorts(Array.isArray(result.cohorts) ? result.cohorts : [])
          setCohortLoadError('')
        }
      } catch (error) {
        if (!cancelled) {
          setCohortLoadError(error.message || 'Unable to load cohorts.')
        }
      } finally {
        if (!cancelled) setIsLoadingCohorts(false)
      }
    }

    loadCohorts()
    return () => {
      cancelled = true
    }
  }, [])

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const getCohortId = (cohort) => cohort.id ?? cohort.cohort_id
  const getCohortName = (cohort) => cohort.name ?? cohort.cohort_name ?? ''
  const getCohortYear = (cohort) => cohort.academicYear ?? cohort.academic_year ?? ''
  const getCohortLabel = (cohort) => `${getCohortName(cohort)}${getCohortYear(cohort) ? ` (${getCohortYear(cohort)})` : ''}`
  const filteredCohorts = cohorts.filter((cohort) => (
    getCohortLabel(cohort).toLowerCase().includes(formData.cohortSearch.trim().toLowerCase())
  ))

  async function handleSubmit(event) {
    event.preventDefault()
    const firstName = formData.firstName.trim()
    const surname = formData.surname.trim()
    const studentNumber = formData.studentNumber.trim()
    const email = formData.email.trim().toLowerCase()
    const role = formData.role.trim().toLowerCase()
    const cohortId = formData.cohortId
    const nextErrors = {}
    const namePattern = /^[\p{L}][\p{L}\s'-]*[\p{L}]$/u
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!firstName) nextErrors.firstName = 'Please enter your first name.'
    else if (firstName.length < 2 || !namePattern.test(firstName)) nextErrors.firstName = 'Enter a valid first name.'
    if (!surname) nextErrors.surname = 'Please enter your last name.'
    else if (surname.length < 2 || !namePattern.test(surname)) nextErrors.surname = 'Enter a valid last name.'
    if (!studentNumber) nextErrors.studentNumber = 'Please enter your student number.'
    if (!email) nextErrors.email = 'Please enter your email address.'
    else if (!emailPattern.test(email)) nextErrors.email = 'Please enter a valid email address.'
    if (!formData.password) nextErrors.password = 'Please create a password.'
    else if (formData.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
    else if (!/[A-Za-z]/.test(formData.password)) nextErrors.password = 'Password must contain at least one letter.'
    else if (!/[0-9]/.test(formData.password)) nextErrors.password = 'Password must contain at least one number.'
    if (!formData.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.'
    else if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'
    if (role === 'student' && !cohortId) nextErrors.cohortId = 'Please select your cohort.'
    if (!['student', 'administrator'].includes(role)) nextErrors.role = 'Please select a role.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setFormData((current) => ({ ...current, email }))
    setIsSubmitting(true)
    try {
      await registerUser({
        first_name: firstName,
        last_name: surname,
        student_number: studentNumber,
        email,
        password: formData.password,
        ...(cohortId ? { cohort_id: Number(cohortId) } : {}),
        role,
      })
      setSuccess(true)
    } catch (error) {
      const fieldMap = {
        first_name: 'firstName',
        last_name: 'surname',
        student_number: 'studentNumber',
        email: 'email',
        password: 'password',
        cohort_id: 'cohortId',
        role: 'role',
      }
      const formField = fieldMap[error.field]

      if (formField) {
        setErrors({ [formField]: error.message || 'Please check this field.' })
      } else {
        setErrors({ form: error.message || 'Unable to create your account. Please try again.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="login-screen">
        <section className="login-brand-panel" aria-label="StudySphere introduction">
          <div className="login-brand-copy"><div className="login-wordmark"><span className="login-wordmark-mark">S</span><span>StudySphere</span></div><div className="login-brand-text"><p className="login-eyebrow">STUDENT PORTAL</p><h1>Start your next chapter.</h1><p>Create your account and make every study hour count.</p></div></div>
        </section>
        <section className="login-form-panel"><div className="login-card panel success-card"><p className="login-form-kicker">ACCOUNT READY</p><h1>Registration successful!</h1><p className="login-subtitle">Your StudySphere account has been created successfully. You can now sign in using your registered email and password.</p><button className="planner-button login-submit" type="button" onClick={onSignIn}>Sign in</button><p className="login-footer">StudySphere · Student Portal</p></div></section>
      </main>
    )
  }

  const inputFields = [
    ['firstName', 'First name', 'text', 'given-name'],
    ['surname', 'Last name', 'text', 'family-name'],
    ['studentNumber', 'Student number', 'text', 'off'],
    ['email', 'Email address', 'email', 'email'],
  ]

  return (
    <main className="login-screen">
      <section className="login-brand-panel" aria-label="StudySphere introduction"><div className="login-brand-copy"><div className="login-wordmark"><span className="login-wordmark-mark">S</span><span>StudySphere</span></div><div className="login-brand-text"><p className="login-eyebrow">STUDENT PORTAL</p><h1>Start your next chapter.</h1><p>Create your account and make every study hour count.</p></div></div></section>
      <section className="login-form-panel"><form className="login-card panel registration-card" onSubmit={handleSubmit} noValidate><div className="login-form-heading"><p className="login-form-kicker">CREATE ACCOUNT</p><h1>Register for StudySphere</h1><p className="login-subtitle">Set up your student account to get started.</p></div>
        <div className="registration-grid">{inputFields.map(([field, label, type, autoComplete]) => <label className="login-field" key={field}>{label}<span className="login-input-wrap"><input type={type} value={formData[field]} onChange={(event) => updateField(field, event.target.value)} autoComplete={autoComplete} /></span>{errors[field] && <span className="login-error" role="alert">{errors[field]}</span>}</label>)}</div>
        <label className="login-field">Password<span className="login-input-wrap"><input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(event) => updateField('password', event.target.value)} autoComplete="new-password" /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Toggle password visibility">◉</button></span>{errors.password && <span className="login-error" role="alert">{errors.password}</span>}</label>
        <label className="login-field">Confirm password<span className="login-input-wrap"><input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} autoComplete="new-password" /><button className="password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label="Toggle confirmation password visibility">◉</button></span>{errors.confirmPassword && <span className="login-error" role="alert">{errors.confirmPassword}</span>}</label>
        <div className="registration-grid optional-fields"><label className="login-field">Role<select required value={formData.role} onChange={(event) => updateField('role', event.target.value)}><option value="">Select role</option><option value="student">Student</option><option value="administrator">Administrator</option></select>{errors.role && <span className="login-error" role="alert">{errors.role}</span>}</label><label className="login-field">Cohort<input type="text" list="registration-cohort-options" value={formData.cohortSearch} onChange={(event) => { const searchValue = event.target.value; const selectedCohort = cohorts.find((cohort) => getCohortLabel(cohort) === searchValue); setFormData((current) => ({ ...current, cohortSearch: searchValue, cohortId: selectedCohort ? String(getCohortId(selectedCohort)) : '' })); }} onFocus={() => { if (formData.cohortId) updateField('cohortSearch', formData.cohortSearch); }} placeholder={isLoadingCohorts ? 'Loading cohorts...' : 'Search and select a cohort'} disabled={isLoadingCohorts || cohorts.length === 0} autoComplete="off" /><datalist id="registration-cohort-options">{filteredCohorts.map((cohort) => <option key={getCohortId(cohort)} value={getCohortLabel(cohort)} />)}</datalist>{errors.cohortId && <span className="login-error" role="alert">{errors.cohortId}</span>}{cohortLoadError && <span className="login-error" role="alert">{cohortLoadError}</span>}{!isLoadingCohorts && !cohortLoadError && cohorts.length === 0 && <span className="login-error" role="alert">No cohorts are currently available.</span>}</label></div>
        {errors.form && <p className="login-error" role="alert">{errors.form}</p>}<button className="planner-button login-submit" type="submit" disabled={isSubmitting || isLoadingCohorts}>{isSubmitting ? 'Creating account...' : 'Register'}</button><p className="auth-switch">Already have an account? <button type="button" onClick={onSignIn}>Sign in</button></p><p className="login-footer">StudySphere · Student Portal</p>
      </form></section>
    </main>
  )
}

function App() {
  const [activeNav, setActiveNav] = useState(() => loadSession()?.user?.role === 'admin' ? 'analytics' : 'dashboard')
  const [authView, setAuthView] = useState('login')
  const [user, setUser] = useState(() => loadSession()?.user || null)
  const [announcements, setAnnouncements] = useState(() => {
    const restoredUser = loadSession()?.user
    return restoredUser ? loadAnnouncements(restoredUser.email) : []
  })
  const [sessionDate, setSessionDate] = useState(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }))
  const [tasks, setTasks] = useState(() => {
    const restoredUser = loadSession()?.user
    return restoredUser ? loadTasks(restoredUser.email) : []
  })
  const [taskModal, setTaskModal] = useState(null)
  const [announcementModal, setAnnouncementModal] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [dashboardData, setDashboardData] = useState(dashboardEmptyState)

  useEffect(() => {
    if (!successMessage) return undefined

    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  useEffect(() => {
    let cancelled = false
    refreshDashboardForUser(user).then((nextDashboardData) => {
      if (!cancelled) setDashboardData(nextDashboardData)
    })
    const handleWindowFocus = () => refreshDashboardForUser(user).then(setDashboardData)
    window.addEventListener('focus', handleWindowFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [user, activeNav])

  function handleLogin({ token, user: backendUser }) {
    const date = new Date()
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const authenticatedUser = {
      user_id: backendUser.user_id,
      firstName: backendUser.first_name?.trim() || 'Student',
      surname: backendUser.last_name?.trim() || '',
      email: backendUser.email.toLowerCase(),
      cohort_id: backendUser.cohort_id ?? null,
      role: backendUser.role,
    }

    setUser(authenticatedUser)
    saveSession({ token, user: authenticatedUser })
    setActiveNav(authenticatedUser.role === 'admin' ? 'analytics' : 'dashboard')
    setSessionDate(formattedDate)
    setTasks(loadTasks(authenticatedUser.email))
    setAnnouncements(loadAnnouncements(authenticatedUser.email))
    setSuccessMessage('Successfully logged in!')
  }

  function handleLogout() {
    setUser(null)
    clearSession()
    setSessionDate(null)
    setTasks([])
    setTaskModal(null)
    setAnnouncements([])
    setAnnouncementModal(null)
    setActiveNav('dashboard')
    setAuthView('login')
    setSuccessMessage('Successfully logged out!')
  }

  function updateTasks(nextTasks) {
    setTasks(nextTasks)
    saveTasks(user.email, nextTasks)
  }

  function handleSaveTask(taskData) {
    const nextTasks = taskData.id
      ? tasks.map((task) => (task.id === taskData.id ? { ...task, ...taskData } : task))
      : [{ ...taskData, id: `${Date.now()}-${Math.random()}`, completed: false }, ...tasks]
    updateTasks(nextTasks)
    refreshDashboardForUser(user).then(setDashboardData)
    setTaskModal(null)
  }

  function handleDeleteTask(taskId) {
    if (!window.confirm('Delete this task?')) return
    updateTasks(tasks.filter((task) => task.id !== taskId))
  }

  function handleToggleTask(taskId) {
    updateTasks(tasks.map((task) => (
      task.id === taskId ? { ...task, completed: !task.completed } : task
    )))
  }

  function updateAnnouncements(nextAnnouncements) {
    setAnnouncements(nextAnnouncements)
    saveAnnouncements(user.email, nextAnnouncements)
  }

  function handleSaveAnnouncement(announcementData) {
    const nextAnnouncements = announcementData.id
      ? announcements.map((announcement) => (
        announcement.id === announcementData.id
          ? { ...announcement, ...announcementData, publishedAt: announcement.publishedAt }
          : announcement
      ))
      : [{ ...announcementData, id: `${Date.now()}-${Math.random()}`, publishedAt: new Date().toISOString() }, ...announcements]
    updateAnnouncements(sortAnnouncements(nextAnnouncements))
    setAnnouncementModal(null)
  }

  function handleDeleteAnnouncement(announcementId) {
    if (!window.confirm('Delete this announcement?')) return
    updateAnnouncements(announcements.filter((announcement) => announcement.id !== announcementId))
  }

  if (!user) {
    return authView === 'register'
      ? <Registration onSignIn={() => setAuthView('login')} />
      : <Login onLogin={handleLogin} onRegister={() => setAuthView('register')} successMessage={successMessage} />
  }

  const currentUser = user
  const isAdministrator = currentUser.role === 'admin'
  const currentNav = (isAdministrator
    ? ['analytics', 'users', 'modules', 'announcements']
    : ['dashboard', 'study-materials', 'ai-chat', 'revision', 'planner']
  ).includes(activeNav) ? activeNav : isAdministrator ? 'analytics' : 'dashboard'
  const firstName = currentUser.firstName.trim()
  const surname = currentUser.surname?.trim() || ''
  const initials = `${firstName.charAt(0)}${surname.charAt(0)}`.toUpperCase()
  const fullName = `${firstName}${surname ? ` ${surname}` : ''}`
  const upcomingTasks = sortTasksByDate(tasks.filter((task) => ['today', 'upcoming'].includes(getTaskStatus(task))))
  const todayTasks = sortTasksByDate(tasks.filter((task) => getTaskStatus(task) === 'today'))
  const pastTasks = sortTasksByDate(tasks.filter((task) => ['overdue', 'completed'].includes(getTaskStatus(task))))

  
  
  return (
    <div className="app-shell">
      <SuccessNotice message={successMessage} />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <span>StudySphere</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {!isAdministrator && <div className="nav-group">
            <p className="nav-label">Student</p>
            <button
              className={`nav-item ${currentNav === 'dashboard' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('dashboard')}
            >
              <span className="nav-icon grid"></span>
              Dashboard
            </button>
            <button className={`nav-item ${currentNav === 'study-materials' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveNav('study-materials')}
            >
              <span className="nav-icon folder"></span>
              Study materials
            </button>

            <button className={`nav-item ${currentNav === 'ai-chat' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveNav('ai-chat')}
            >
              <span className="nav-icon chat"></span>
              AI chat assistant
            </button>

            <button className={`nav-item ${currentNav === 'revision' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveNav('revision')}
            >
              <span className="nav-icon revision"></span>
              Revision hub
            </button>

            <button
              className={`nav-item ${currentNav === 'planner' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('planner')}
            >
              <span className="nav-icon planner"></span>
              Study planner
            </button>
          </div>}

          {isAdministrator && <div className="nav-group">
            <p className="nav-label">Administrator</p>
            <button
              className={`nav-item ${currentNav === 'analytics' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('analytics')}
            >
              <span className="nav-icon analytics"></span>
              Analytics
            </button>
            <button
              className={`nav-item ${currentNav === 'users' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('users')}
            >
              <span className="nav-icon users"></span>
              User management
            </button>
            <button
              className={`nav-item ${currentNav === 'modules' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('modules')}
            >
              <span className="nav-icon modules"></span>
              Modules &amp; cohorts
            </button>
            <button
              className={`nav-item ${currentNav === 'announcements' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('announcements')}
            >
              <span className="nav-icon announce"></span>
              Announcements
            </button>
          </div>}

          <div className="nav-group preview">
            <button className="nav-item" type="button">
              <span className="nav-icon login"></span>
              Login / register screen
            </button>
          </div>
        </nav>

        <div className="profile-box">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-text">
            <strong>{fullName}</strong>
            <span>{isAdministrator ? 'Administrator' : 'Student'}</span>
          </div>
        </div>
      </aside>

      <main className="main-panel content-stack">
        <div className="session-bar">
          <span className="session-badge">Logged in as {currentUser.firstName}</span>
          <button className="logout-button" type="button" onClick={handleLogout}>Log out</button>
        </div>

        {currentNav === 'dashboard' ? (
          <DashboardOverview
            currentUser={currentUser}
            sessionDate={sessionDate}
            dashboardData={dashboardData}
            onAddTask={() => setTaskModal(emptyTask)}
            upcomingTasks={upcomingTasks}
            todayTasks={todayTasks}
            pastTasks={pastTasks}
            onEditTask={setTaskModal}
            onDeleteTask={handleDeleteTask}
            onToggleTask={handleToggleTask}
          />
        ) : currentNav === 'planner' ? (
          <section className="planner-view focused">
            <header className="planner-header">
              <div className="page-title-block">
                <h1>Study planner</h1>
                <p>Track assignments, exams and study sessions.</p>
                <PlannerClock />
              </div>

              <button className="planner-button" type="button" onClick={() => setTaskModal(emptyTask)}>
                <span className="plus">+</span> Add task
              </button>
            </header>

            <section className="task-panel panel">
              <div className="section-heading-row">
                <div>
                  <h2>Your tasks</h2>
                  <p className="panel-subtitle">Add and manage your study workload in one place.</p>
                </div>
                <span className="section-count">{tasks.length}</span>
              </div>

              {tasks.length ? (
                <ul className="task-list">
                  {tasks.map((task) => (
                    <TaskItem key={task.id} task={task} onEdit={setTaskModal} onDelete={handleDeleteTask} onToggle={handleToggleTask} />
                  ))}
                </ul>
              ) : (
                <div className="empty-state planner-empty-state">
                  <strong>No tasks yet</strong>
                  <p>Add your first task to get started.</p>
                  <button className="planner-button" type="button" onClick={() => setTaskModal(emptyTask)}>Add your first task</button>
                </div>
              )}
            </section>
          </section>
          
        ): currentNav === 'study-materials' ? (
          <StudyMaterials />
        ): currentNav === 'ai-chat' ? (
          <AIChat />
        ): currentNav === 'revision' ? (
          <RevisionHub />

        ) : currentNav === 'analytics' ? (
          <AnalyticsDashboard />
        ) : currentNav === 'users' ? (
          <UserManagement />
        ) : currentNav === 'modules' ? (
          <ModulesAndCohorts />
        ) : null}
      </main>

      {currentNav === 'announcements' && (
        <section className="announcements-screen">
          <div className="app-icons-bar">
            <button className="mini-app gmail" type="button" aria-label="Gmail" />
            <button className="mini-app adobe" type="button" aria-label="Adobe" />
            <button className="mini-app whatsapp" type="button" aria-label="WhatsApp" />
          </div>

          <div className="announcements-content">
            <div className="announcements-header">
              <h1>Announcements</h1>
              <p>Updates from StudySphere.</p>
              <button className="planner-button announcement-add-button" type="button" onClick={() => setAnnouncementModal(emptyAnnouncement)}>
                <span className="plus">+</span> Add announcement
              </button>
            </div>

            <div className="published-panel panel announcement-read-only">
              <div className="published-header">Available announcements</div>
              {announcements.length > 0 ? (
                <div className="announcement-list">
                  {announcements.map((item) => (
                    <AnnouncementItem
                      key={item.id}
                      announcement={item}
                      onEdit={setAnnouncementModal}
                      onDelete={handleDeleteAnnouncement}
                      showActions
                    />
                  ))}
                </div>
              ) : (
                <p className="announcement-empty">No announcements</p>
              )}
            </div>
          </div>
        </section>
      )}

      {taskModal && (
        <TaskForm
          task={taskModal.id ? taskModal : null}
          onSave={handleSaveTask}
          onCancel={() => setTaskModal(null)}
        />
      )}

      {announcementModal && (
        <AnnouncementForm
          announcement={announcementModal.id ? announcementModal : null}
          onSave={handleSaveAnnouncement}
          onCancel={() => setAnnouncementModal(null)}
        />
      )}
    </div>
  )
}

export default App
