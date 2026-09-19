import { useState } from 'react'
import './App.css'

const announcements = [
  {
    tag: 'Campus-wide',
    tagClass: 'amber',
    text: 'Library extended hours begin this weekend for the exam period.',
  },
  {
    tag: 'Database Systems',
    tagClass: 'mint',
    text: 'Assignment 3 rubric has been uploaded to the module page.',
  },
]

const metrics = [
  { label: 'Active modules', value: 5, meta: 'Across 2 cohorts' },
  { label: 'Upcoming deadlines', value: 3, meta: '1 due within 48 hours' },
  { label: 'AI questions this week', value: 12, meta: 'of 20/min limit' },
]

const deadlines = [
  {
    title: 'Database Systems — Assignment 3',
    subtitle: 'Due tomorrow, 23:59',
    timing: '48h',
    iconClass: 'red',
    type: 'paper',
  },
  {
    title: 'Networks — Semester Test 2',
    subtitle: 'Fri, 6 Sep • 09:00',
    timing: 'Exam',
    iconClass: 'purple',
    type: 'book',
  },
  {
    title: 'Group study session — OS module',
    subtitle: 'Mon, 9 Sep • 14:00',
    timing: 'Study',
    iconClass: 'green',
    type: 'group',
  },
]

const documents = [
  { name: 'Lecture 4 — Normalisation.pdf', size: 'Database Systems • 2.1 MB', iconClass: 'file' },
  { name: 'Tutorial 3 Notes.docx', size: 'Computer Networks • 640 KB', iconClass: 'doc' },
  { name: 'Week 6 Summary.txt', size: 'Operating Systems • 12 KB', iconClass: 'text' },
]

const plannerDays = [
  { label: 'Mon 2', value: '' },
  { label: 'Tue 3', value: '' },
  { label: 'Wed 4', value: 'Assignment 3 due', accent: 'salmon' },
  { label: 'Thu 5', value: 'Networks test', accent: 'lavender' },
  { label: 'Fri 6', value: 'Revision session', accent: 'mint' },
]

const tasks = [
  {
    title: 'Database Systems — Assignment 3',
    date: 'Wed, 4 Sep • 23:59',
    tag: 'Assignment',
    tagClass: 'assignment',
    done: false,
  },
  {
    title: 'Networks — Semester Test 2',
    date: 'Fri, 6 Sep • 09:00',
    tag: 'Exam',
    tagClass: 'exam',
    done: false,
  },
  {
    title: 'Group study session — OS module',
    date: 'Sun, 8 Sep • 14:00',
    tag: 'Study',
    tagClass: 'study',
    done: true,
  },
]

const publishedAnnouncements = [
  {
    tag: 'Campus-wide',
    tagClass: 'amber',
    title: 'Library extended hours',
    published: 'Published 2 Sep',
  },
  {
    tag: 'Database Systems',
    tagClass: 'mint',
    title: 'Assignment 3 rubric uploaded',
    published: 'Published 1 Sep',
  },
]

export function Login({ onLogin }) {
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()

    const trimmedFirstName = firstName.trim()
    const trimmedSurname = surname.trim()
    const trimmedEmail = email.trim()
    const nextErrors = {}
    const namePattern = /^[\p{L}][\p{L}\s'-]*[\p{L}]$/u
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    setFirstName(trimmedFirstName)
    setSurname(trimmedSurname)
    setEmail(trimmedEmail)

    if (!trimmedFirstName) {
      nextErrors.firstName = 'First name is required'
    } else if (trimmedFirstName.length < 2) {
      nextErrors.firstName = 'First name must be at least 2 characters'
    } else if (!namePattern.test(trimmedFirstName)) {
      nextErrors.firstName = 'First name can only contain letters, spaces, hyphens, or apostrophes'
    }

    if (!trimmedSurname) {
      nextErrors.surname = 'Surname is required'
    } else if (trimmedSurname.length < 2) {
      nextErrors.surname = 'Surname must be at least 2 characters'
    } else if (!namePattern.test(trimmedSurname)) {
      nextErrors.surname = 'Surname can only contain letters, spaces, hyphens, or apostrophes'
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required'
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address'
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    let storedUsers = {}
    try {
      storedUsers = JSON.parse(localStorage.getItem('studysphere_users') || '{}')
    } catch {
      storedUsers = {}
    }

    const storedPassword = storedUsers[trimmedEmail]

    // Prototype-only mock authentication: plaintext localStorage, no backend or hashing; not production-safe.
    if (storedPassword && storedPassword !== password) {
      setErrors({ password: 'Incorrect password for this email' })
      return
    }

    if (!storedPassword && password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters for a new account' })
      return
    }

    if (!storedPassword) {
      storedUsers[trimmedEmail] = password
      try {
        localStorage.setItem('studysphere_users', JSON.stringify(storedUsers))
      } catch {
        // Continue the prototype login if browser storage is unavailable.
      }
    }

    const normalizedFirstName = trimmedFirstName.toLowerCase()
    const displayFirstName = normalizedFirstName.charAt(0).toUpperCase() + normalizedFirstName.slice(1)
    setErrors({})
    onLogin({
      firstName: displayFirstName,
      surname: trimmedSurname,
      email: trimmedEmail,
      password,
    })
  }

  return (
    <main className="login-screen">
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

          <div className="login-name-row">
            <label className="login-field">
              First name
              <span className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5.5 19c.7-3.1 2.9-4.7 6.5-4.7s5.8 1.6 6.5 4.7" />
                </svg>
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                />
              </span>
              {errors.firstName && <span className="login-error" role="alert">{errors.firstName}</span>}
            </label>

            <label className="login-field">
              Surname
              <span className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5.5 19c.7-3.1 2.9-4.7 6.5-4.7s5.8 1.6 6.5 4.7" />
                </svg>
                <input
                  type="text"
                  value={surname}
                  onChange={(event) => setSurname(event.target.value)}
                  autoComplete="family-name"
                />
              </span>
              {errors.surname && <span className="login-error" role="alert">{errors.surname}</span>}
            </label>
          </div>

          <label className="login-field">
            Email address
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

          <button className="planner-button login-submit" type="submit">Log in</button>
          <p className="login-footer">StudySphere · Student Portal</p>
        </form>
      </section>
    </main>
  )
}

function App() {
  const [activeNav, setActiveNav] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [sessionDate, setSessionDate] = useState(null)

  function handleLogin({ firstName, surname, email }) {
    const date = new Date()
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    setUser({ firstName, surname, email })
    setSessionDate(formattedDate)
  }

  function handleLogout() {
    setUser(null)
    setSessionDate(null)
    setActiveNav('dashboard')
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const firstName = user.firstName.trim()
  const surname = user.surname?.trim() || ''
  const initials = `${firstName.charAt(0)}${surname.charAt(0)}`.toUpperCase()
  const fullName = `${firstName}${surname ? ` ${surname}` : ''}`

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <span>StudySphere</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="nav-group">
            <p className="nav-label">Student</p>
            <button
              className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('dashboard')}
            >
              <span className="nav-icon grid"></span>
              Dashboard
            </button>
            <button className="nav-item" type="button">
              <span className="nav-icon folder"></span>
              Study materials
            </button>
            <button className="nav-item" type="button">
              <span className="nav-icon chat"></span>
              AI chat assistant
            </button>
            <button className="nav-item" type="button">
              <span className="nav-icon revision"></span>
              Revision hub
            </button>
            <button
              className={`nav-item ${activeNav === 'planner' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('planner')}
            >
              <span className="nav-icon planner"></span>
              Study planner
            </button>
          </div>

          <div className="nav-group">
            <p className="nav-label">Administrator</p>
            <button className="nav-item" type="button">
              <span className="nav-icon analytics"></span>
              Analytics
            </button>
            <button className="nav-item" type="button">
              <span className="nav-icon users"></span>
              User management
            </button>
            <button className="nav-item" type="button">
              <span className="nav-icon modules"></span>
              Modules &amp; cohorts
            </button>
            <button
              className={`nav-item ${activeNav === 'announcements' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveNav('announcements')}
            >
              <span className="nav-icon announce"></span>
              Announcements
            </button>
          </div>

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
            <span>Student</span>
          </div>
        </div>
      </aside>

      <main className="main-panel content-stack">
        <div className="session-bar">
          <span className="session-badge">Logged in as {user.firstName}</span>
          <button className="logout-button" type="button" onClick={handleLogout}>Log out</button>
        </div>

        {activeNav === 'dashboard' ? (
          <section className="dashboard-view focused">
            <header className="topbar">
              <div className="heading-wrap">
                <p className="date-line">{sessionDate}</p>
                <h1>Welcome, {user.firstName}</h1>
              </div>

              <button className="planner-button" type="button">
                <span className="plus">+</span> Add planner task
              </button>
            </header>

            <section className="announcement-card panel">
              <h2>Announcements</h2>
              <div className="announcement-list">
                {announcements.map((item) => (
                  <div key={item.text} className="announcement-item">
                    <span className={`tag ${item.tagClass}`}>{item.tag}</span>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="metric-grid">
              {metrics.map((metric) => (
                <div key={metric.label} className="metric-card panel">
                  <h3>{metric.label}</h3>
                  <div className="metric-value">{metric.value}</div>
                  <p>{metric.meta}</p>
                </div>
              ))}
            </section>

            <section className="lower-grid">
              <div className="panel deadlines-panel">
                <h2>Upcoming deadlines</h2>

                {deadlines.map((deadline) => (
                  <div key={deadline.title} className="deadline-item">
                    <div className={`deadline-icon ${deadline.iconClass}`}>
                      <span className={deadline.type}></span>
                    </div>

                    <div className="deadline-copy">
                      <h3>{deadline.title}</h3>
                      <p>{deadline.subtitle}</p>
                    </div>

                    <div className="deadline-meta">{deadline.timing}</div>
                  </div>
                ))}
              </div>

              <div className="panel documents-panel">
                <h2>Recent documents</h2>

                {documents.map((doc) => (
                  <div key={doc.name} className="document-item">
                    <div className={`doc-icon ${doc.iconClass}`}></div>

                    <div className="doc-copy">
                      <h3>{doc.name}</h3>
                      <p>{doc.size}</p>
                    </div>

                    <button className="doc-action" type="button" aria-label={`Open ${doc.name}`}>
                      <span className="action-mark"></span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </section>
        ) : (
          <section className="planner-view focused">
            <header className="planner-header">
              <div className="page-title-block">
                <h1>Study planner</h1>
                <p>Track assignments, exams and study sessions.</p>
              </div>

              <button className="planner-button" type="button">
                <span className="plus">+</span> Add task
              </button>
            </header>

            <section className="planner-days" aria-label="Planner calendar">
              {plannerDays.map((day) => (
                <div key={day.label} className={`day-card ${day.accent ? day.accent : ''}`}>
                  <span className="day-label">{day.label}</span>
                  {day.value && <span className="day-chip">{day.value}</span>}
                </div>
              ))}
            </section>

            <section className="task-panel panel">
              <h2>This week</h2>

              <ul className="task-list">
                {tasks.map((task) => (
                  <li key={task.title} className="task-row">
                    <div className="task-main">
                      <span className={`checkbox ${task.done ? 'checked' : ''}`}></span>
                      <div className="task-copy">
                        <div className="task-title">{task.title}</div>
                        <div className="task-date">{task.date}</div>
                      </div>
                    </div>

                    <span className={`task-tag ${task.tagClass}`}>{task.tag}</span>
                  </li>
                ))}
              </ul>
            </section>
          </section>
        )}
      </main>

      {activeNav === 'announcements' && (
        <section className="announcements-screen">
          <div className="app-icons-bar">
            <button className="mini-app gmail" type="button" aria-label="Gmail" />
            <button className="mini-app adobe" type="button" aria-label="Adobe" />
            <button className="mini-app whatsapp" type="button" aria-label="WhatsApp" />
          </div>

          <div className="announcements-content">
            <div className="announcements-header">
              <h1>Announcements</h1>
              <p>Broadcast updates to students.</p>
            </div>

            <div className="announcement-editor panel">
              <div className="editor-title">New announcement</div>

              <div className="field-block">
                <label htmlFor="announcement-title">Title</label>
                <input id="announcement-title" type="text" value="Library extended hours" readOnly />
              </div>

              <div className="field-block">
                <label htmlFor="announcement-message">Message</label>
                <textarea id="announcement-message" readOnly defaultValue="Write the announcement..." />
              </div>

              <div className="meta-row">
                <div className="field-block audience-field">
                  <label htmlFor="announcement-audience">Audience</label>
                  <div className="select-wrap">
                    <select id="announcement-audience" defaultValue="Campus-wide">
                      <option>Campus-wide</option>
                      <option>Database Systems</option>
                    </select>
                  </div>
                </div>

                <div className="field-block date-field">
                  <label htmlFor="announcement-date">Expires (optional)</label>
                  <div className="date-wrap">
                    <input id="announcement-date" type="text" defaultValue="yyyy/mm/dd" readOnly />
                    <span className="calendar-icon" aria-hidden="true"></span>
                  </div>
                </div>
              </div>

              <button className="publish-button" type="button">Publish announcement</button>
            </div>

            <div className="published-panel panel">
              <div className="published-header">Published</div>

              {publishedAnnouncements.map((item) => (
                <div key={item.title} className="published-item">
                  <span className={`published-tag ${item.tagClass}`}>{item.tag}</span>
                  <div className="published-copy">
                    <div className="published-title">{item.title}</div>
                    <div className="published-date">{item.published}</div>
                  </div>
                  <button className="trash-button" type="button" aria-label={`Delete ${item.title}`}>
                    <span aria-hidden="true">🗑</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="power-pill">
        <span className="power-bolt"></span>
        Powered by Netlify
      </div>
    </div>
  )
}

export default App

