import React from 'react';

export default function AnalyticsDashboard() {
  return (
    <div className="planner-view focused">
      <header className="planner-header">
        <div className="page-title-block">
          <h1>Analytics dashboard</h1>
          <p>Engagement and system health across StudySphere.</p>
        </div>
      </header>

      {/* Top Metric Cards Grid */}
      <section className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="metric-card panel">
          <h3>Active users (7d)</h3>
          <div className="metric-value">842</div>
          <p style={{ color: '#059669', fontWeight: 500, fontSize: '0.8rem' }}>+6% vs last week</p>
        </div>
        <div className="metric-card panel">
          <h3>Modules live</h3>
          <div className="metric-value">24</div>
          <p>Active courses</p>
        </div>
        <div className="metric-card panel">
          <h3>AI requests today</h3>
          <div className="metric-value">3,410</div>
          <p>Chat interactions</p>
        </div>
        <div className="metric-card panel">
          <h3>System errors (24h)</h3>
          <div className="metric-value" style={{ color: '#b91c1c' }}>3</div>
          <p>Requires monitoring</p>
        </div>
      </section>

      {/* Two-Column Section: Active Modules & System Logs */}
      <div className="dashboard-task-grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* Most Active Modules */}
        <section className="task-panel panel">
          <div className="section-heading-row">
            <h2>Most active modules</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#334155' }}>
                <span>Database Systems</span>
                <span>88%</span>
              </div>
              <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#312e81', width: '88%', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#334155' }}>
                <span>Computer Networks</span>
                <span>71%</span>
              </div>
              <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#312e81', width: '71%', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#334155' }}>
                <span>Operating Systems</span>
                <span>63%</span>
              </div>
              <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#312e81', width: '63%', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#334155' }}>
                <span>Software Eng.</span>
                <span>44%</span>
              </div>
              <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#312e81', width: '44%', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent System Logs */}
        <section className="task-panel panel">
          <div className="section-heading-row">
            <h2>Recent system logs</h2>
          </div>
          <ul className="task-list" style={{ marginTop: '8px' }}>
            <li className="task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <span className="task-tag priority-high" style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginRight: '8px' }}>Error</span>
                <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>OpenAI API timeout on chat request</strong>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>10:42</span>
            </li>
            <li className="task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <span className="task-tag priority-medium" style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginRight: '8px' }}>Warning</span>
                <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>Rate limit reached — user #4021</strong>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>09:58</span>
            </li>
            <li className="task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <span className="task-tag priority-low" style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginRight: '8px' }}>Info</span>
                <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>Database backup completed</strong>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>03:00</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}