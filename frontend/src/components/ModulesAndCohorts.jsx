import React from 'react';

export default function ModulesAndCohorts() {
  const modules = [
    { code: 'CMPG323', name: 'Database Systems', cohorts: 2 },
    { code: 'CMPG341', name: 'Computer Networks', cohorts: 2 },
    { code: 'CMPG312', name: 'Operating Systems', cohorts: 1 },
  ];

  const cohorts = [
    { name: '2026-CS-A', students: 64, moduleCount: 3 },
    { name: '2026-CS-B', students: 58, moduleCount: 3 },
  ];

  return (
    <div className="planner-view focused">
      <header className="planner-header">
        <div className="page-title-block">
          <h1>Modules &amp; cohorts</h1>
          <p>Organise academic modules and student cohorts.</p>
        </div>

        <button className="planner-button" type="button">
          <span className="plus">+</span> Create module
        </button>
      </header>

      {/* Two-Column Layout Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Modules Panel */}
        <section className="task-panel panel" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>Modules</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ paddingBottom: '12px', width: '30%' }}>Code</th>
                <th style={{ paddingBottom: '12px', width: '50%' }}>Module</th>
                <th style={{ paddingBottom: '12px', textAlign: 'right', width: '20%' }}>Cohorts</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod, index) => (
                <tr key={index} style={{ borderBottom: index < modules.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '16px 0', fontWeight: 500, color: '#334155' }}>{mod.code}</td>
                  <td style={{ padding: '16px 0', color: '#475569' }}>{mod.name}</td>
                  <td style={{ padding: '16px 0', textAlign: 'right', color: '#475569', fontWeight: 500 }}>{mod.cohorts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Cohorts Panel */}
        <section className="task-panel panel" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>Cohorts</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cohorts.map((cohort, index) => (
              <div key={index} style={{ padding: '14px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '3px' }}>{cohort.name}</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{cohort.students} students · {cohort.moduleCount} modules</p>
                </div>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.9rem', padding: '4px' }} aria-label="Edit cohort">
                  ✏️
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}