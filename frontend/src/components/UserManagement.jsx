import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Student');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');

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
    fetchUsers();
  }, []);

  function fetchUsers() {
    fetch(`${API_URL}/users`, {
      headers: { ...getAuthHeader() }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      })
      .then((data) => {
        const userList = Array.isArray(data) ? data : (data.users || data.data || data.items || []);
        setUsers(userList.filter(Boolean)); // Filter out any null/undefined entries
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching users from backend:', err);
        setLoading(false);
      });
  }

  function handleOpenEdit(user) {
    if (!user) return;
    setEditingUser(user);
    setNewName(user.name || '');
    setNewEmail(user.email || '');
    setNewRole(user.role || 'Student');
    setIsModalOpen(true);
  }

  function handleSaveUser(e) {
    e.preventDefault();
    const targetId = editingUser?.user_id || editingUser?.id;
    if (!newName.trim() || !newEmail.trim() || !targetId) return;

    const url = `${API_URL}/users/${targetId}`;

    fetch(url, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ 
        name: newName.trim(), 
        email: newEmail.trim(), 
        role: newRole,
        status: 'Active'
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update user');
        return res.json();
      })
      .then(() => {
        fetchUsers(); // Refresh list from backend
        setIsModalOpen(false);
        setEditingUser(null);
        setNewName('');
        setNewEmail('');
        setNewRole('Student');
      })
      .catch((err) => console.error('Error updating user:', err));
  }

 function handleDeleteUser(user) {
    const targetId = user?.user_id || user?.id;
    if (!targetId) return;
    
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    fetch(`${API_URL}/users/${targetId}`, {
      method: 'DELETE',
      headers: { 
        ...getAuthHeader() 
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete user');
        // Instantly remove the deleted user from the frontend state list
        setUsers(users.filter((u) => (u?.user_id || u?.id) !== targetId));
      })
      .catch((err) => console.error('Error deleting user:', err));
  }

  // Filter users safely
  const filteredUsers = users.filter((user) => {
    if (!user) return false;
    const matchesSearch = 
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = 
      roleFilter === 'All roles' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return <div className="planner-view focused"><p>Loading user management from database...</p></div>;
  }

  return (
    <div className="planner-view focused">
      <header className="planner-header">
        <div className="page-title-block">
          <h1>User management</h1>
          <p>Manage system users and database records securely.</p>
        </div>
      </header>

      {/* Toolbar with Search Bar and Role Filter Dropdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '320px' }}>
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', background: '#fff', cursor: 'pointer', minWidth: '140px' }}
          >
            <option value="All roles">All roles</option>
            <option value="Student">Student</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>
      </div>

      {/* Users Table Panel */}
      <section className="task-panel panel" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ paddingBottom: '12px', width: '25%' }}>Name</th>
              <th style={{ paddingBottom: '12px', width: '30%' }}>Email</th>
              <th style={{ paddingBottom: '12px', width: '20%' }}>Role</th>
              <th style={{ paddingBottom: '12px', width: '15%' }}>Status</th>
              <th style={{ paddingBottom: '12px', textAlign: 'right', width: '10%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <tr key={user?.user_id || user?.id || index} style={{ borderBottom: index < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '16px 0', fontWeight: 500, color: '#334155' }}>{user?.name || 'Unknown'}</td>
                  <td style={{ padding: '16px 0', color: '#475569' }}>{user?.email || 'N/A'}</td>
                  <td style={{ padding: '16px 0', color: '#334155' }}>
                    <span style={{ padding: '2px 8px', background: user?.role === 'Administrator' ? '#e0f2fe' : '#f1f5f9', color: user?.role === 'Administrator' ? '#0369a1' : '#475569', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {user?.role || 'Student'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 0', color: user?.status === 'Active' ? '#059669' : '#94a3b8', fontWeight: 500 }}>
                    {user?.status || 'Active'}
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        onClick={() => handleOpenEdit(user)} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7', fontSize: '0.875rem', fontWeight: 500 }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteUser(user)} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.875rem', fontWeight: 500 }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  No users found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Edit User Modal */}
      {isModalOpen && (
        <div className="task-modal-backdrop" role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="task-modal panel" onSubmit={handleSaveUser} style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div className="task-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>Edit user</h2>
              <button className="modal-close" type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
            </div>

            <div className="task-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                Full Name
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                Email Address
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required style={{ padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                Role
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="Student">Student</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </label>
            </div>

            <div className="task-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="modal-secondary-button" type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button className="planner-button" type="submit" style={{ padding: '8px 16px', background: '#312e81', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}