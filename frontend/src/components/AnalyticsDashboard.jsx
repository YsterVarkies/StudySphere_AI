import React, { useState, useEffect } from 'react';

// Default empty/zero state to prevent flashing mock data
const initialStats = {
  activeUsers: 0,
  modulesLive: 0,
  aiRequestsToday: 0,
  systemErrors: 0,
  activeModules: [],
  recentLogs: []
};

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);

  // Helper to extract JWT token from studysphere_session storage
  function getAuthHeader() {
    try {
      const sessionStr = localStorage.getItem('studysphere_session');
      if (!sessionStr) return {};
      const session = JSON.parse(sessionStr);
      return session.token ? { 'Authorization': `Bearer ${session.token}` } : {};
    } catch (e) {
      console.error("Error reading session token:", e);
      return {};
    }
  }

  useEffect(() => {
    fetch('http://localhost:5000/api/analytics', {
      headers: { ...getAuthHeader() }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('Successfully fetched live analytics:', data);
        // Handle both direct object response or wrapped { analytics: { ... } } response
        const analyticsPayload = data.analytics || data;
        if (analyticsPayload) {
          setStats((prev) => ({ ...prev, ...analyticsPayload }));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Backend connection failed:', err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="planner-view focused"><p>Loading live analytics...</p></div>;
  }

  return (
    <div className="planner-view focused">
      <header className="planner-header">
        <div className="page-title-block">
          <h1>Analytics dashboard</h1>
          <p>Engagement and system health across StudySphere.</p>
        </div>
      </header>

      {/* Top Metric Cards Grid */}
      <section className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="metric-card panel" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Active users (7d)</h3>
        <div className="metric-value" style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          {stats.activeUsers}
        </div>
        <p style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 500, marginTop: '4px' }}>
          {stats.userGrowth || "+0%"} vs last week
        </p>
      </div>
        <div className="metric-card panel" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Modules live</h3>
          <div className="metric-value" style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{stats.modulesLive}</div>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Active courses</p>
        </div>
        <div className="metric-card panel" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>AI requests today</h3>
          <div className="metric-value" style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{stats.aiRequestsToday?.toLocaleString()}</div>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Chat interactions</p>
        </div>
        <div className="metric-card panel" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>System errors (24h)</h3>
          <div className="metric-value" style={{ fontSize: '1.875rem', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>{stats.systemErrors}</div>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Requires monitoring</p>
        </div>
      </section>

      {/* Two-Column Section: Active Modules & System Logs */}
      <div className="dashboard-task-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Most Active Modules */}
        <section className="task-panel panel" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
          <div className="section-heading-row">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Most active modules</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {stats.activeModules && stats.activeModules.length > 0 ? (
              stats.activeModules.map((mod, index) => (
                <div key={index} className="module-bar-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#334155' }}>
                    <span>{mod.name}</span>
                    <span>{mod.percentage}%</span>
                  </div>
                  <div className="progress-bar-track" style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div className="progress-bar-fill" style={{ background: '#312e81', width: `${mod.percentage}%`, height: '100%', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No module activity recorded yet.</p>
            )}
          </div>
        </section>

        {/* Recent System Logs */}
        <section className="task-panel panel" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
          <div className="section-heading-row">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Recent system logs</h2>
          </div>
          <ul className="task-list" style={{ marginTop: '8px', listStyle: 'none', padding: 0 }}>
            {stats.recentLogs && stats.recentLogs.length > 0 ? (
              stats.recentLogs.map((log, index) => {
                const tagStyle = 
                  log.type === 'Error' ? { background: '#fee2e2', color: '#991b1b' } :
                  log.type === 'Warning' ? { background: '#fef3c7', color: '#92400e' } :
                  { background: '#e0f2fe', color: '#0369a1' };

                return (
                  <li key={index} className="task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <span className="task-tag" style={{ ...tagStyle, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginRight: '8px' }}>{log.type}</span>
                      <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{log.message}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.time}</span>
                  </li>
                );
              })
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No recent system logs.</p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}