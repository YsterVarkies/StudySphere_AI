import React, { useState } from 'react';

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');

  const users = [
    { id: 1, name: 'Aisha Khumalo', email: 'a.khumalo@university.ac.za', role: 'Student', cohort: '2026-CS-A', status: 'Active' },
    { id: 2, name: 'Thabo Nkosi', email: 't.nkosi@university.ac.za', role: 'Student', cohort: '2026-CS-B', status: 'Active' },
    { id: 3, name: 'Dr. Lerato Mokoena', email: 'l.mokoena@university.ac.za', role: 'Administrator', cohort: '—', status: 'Active' },
    { id: 4, name: 'Sipho Dlamini', email: 's.dlamini@university.ac.za', role: 'Student', cohort: '2026-CS-A', status: 'Disabled' },
  ];

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All roles' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="planner-view focused">
      <header className="planner-header">
        <div className="page-title-block">
          <h1>User management</h1>
          <p>Manage accounts, roles and status.</p>
        </div>

        <button className="planner-button" type="button">
          <span className="plus">+</span> Add user
        </button>
      </header>

      {/* Search and Filter Controls Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '0.875rem',
            color: '#334155',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option>All roles</option>
          <option>Student</option>
          <option>Administrator</option>
        </select>
      </div>

      {/* User Table Panel */}
      <section className="task-panel panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 24px' }}>Name</th>
              <th style={{ padding: '16px 16px' }}>Email</th>
              <th style={{ padding: '16px 16px' }}>Role</th>
              <th style={{ padding: '16px 16px' }}>Cohort</th>
              <th style={{ padding: '16px 16px' }}>Status</th>
              <th style={{ padding: '16px 24px', textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 500, color: '#1e293b' }}>{user.name}</td>
                  <td style={{ padding: '16px 16px', color: '#475569' }}>{user.email}</td>
                  <td style={{ padding: '16px 16px', color: '#475569' }}>{user.role}</td>
                  <td style={{ padding: '16px 16px', color: '#475569' }}>{user.cohort}</td>
                  <td style={{ padding: '16px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: user.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                      color: user.status === 'Active' ? '#166534' : '#475569',
                    }}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>
                    ···
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No users found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}