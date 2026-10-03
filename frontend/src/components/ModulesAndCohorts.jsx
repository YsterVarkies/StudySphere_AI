import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ModulesAndCohorts() {
  const [data, setData] = useState({ modules: [], cohorts: [] });
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isCohortModalOpen, setIsCohortModalOpen] = useState(false);
  
  // Edit tracking states (storing IDs/codes)
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingCohortId, setEditingCohortId] = useState(null);

  // Form states matching inputs
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCohortName, setNewCohortName] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('2026');

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
    fetchModulesAndCohorts();
  }, []);

  function fetchModulesAndCohorts() {
    Promise.all([
      fetch(`${API_URL}/modules`, { headers: { ...getAuthHeader() } }).then(res => res.json()),
      fetch(`${API_URL}/cohorts`, { headers: { ...getAuthHeader() } }).then(res => res.json())
    ])
      .then(([modulesResult, cohortsResult]) => {
        const moduleList = modulesResult.modules || modulesResult;
        const cohortList = cohortsResult.cohorts || cohortsResult;

        setData({
          modules: Array.isArray(moduleList) ? moduleList : [],
          cohorts: Array.isArray(cohortList) ? cohortList : []
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching modules and cohorts:', err);
        setLoading(false);
      });
  }

  function handleSaveModule(e) {
    e.preventDefault();
    
    // Check if we are updating or creating
    const isEditing = Boolean(editingModuleId);
    const url = isEditing ? `${API_URL}/modules/${editingModuleId}` : `${API_URL}/modules`;
    const method = isEditing ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader() 
      },
      body: JSON.stringify({ 
        module_code: newCode, 
        module_name: newName,
        module_id: editingModuleId 
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save module');
        return res.json();
      })
      .then(() => {
        fetchModulesAndCohorts();
        closeModuleModal();
      })
      .catch((err) => console.error('Error saving module:', err));
  }

  function handleSaveCohort(e) {
    e.preventDefault();
    
    const isEditing = Boolean(editingCohortId);
    const url = isEditing ? `${API_URL}/cohorts/${editingCohortId}` : `${API_URL}/cohorts`;
    const method = isEditing ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader() 
      },
      body: JSON.stringify({ 
        cohort_name: newCohortName, 
        academic_year: newAcademicYear,
        cohort_id: editingCohortId
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save cohort');
        return res.json();
      })
      .then(() => {
        fetchModulesAndCohorts();
        closeCohortModal();
      })
      .catch((err) => console.error('Error saving cohort:', err));
  }

  function openEditModuleModal(mod) {
    setEditingModuleId(mod.module_id || mod.id);
    setNewCode(mod.code || mod.module_code || '');
    setNewName(mod.name || mod.module_name || '');
    setIsModuleModalOpen(true);
  }

  function closeModuleModal() {
    setEditingModuleId(null);
    setNewCode('');
    setNewName('');
    setIsModuleModalOpen(false);
  }

  function openEditCohortModal(cohort) {
    setEditingCohortId(cohort.cohort_id || cohort.id);
    setNewCohortName(cohort.name || cohort.cohort_name || '');
    setNewAcademicYear(cohort.academicYear || cohort.academic_year || '2026');
    setIsCohortModalOpen(true);
  }

  function closeCohortModal() {
    setEditingCohortId(null);
    setNewCohortName('');
    setNewAcademicYear('2026');
    setIsCohortModalOpen(false);
  }

  function handleDeleteModule(modId) {
    if (!modId || !window.confirm('Are you sure you want to delete this module?')) return;

    fetch(`${API_URL}/modules/${modId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete module');
        fetchModulesAndCohorts();
      })
      .catch(err => console.error('Error deleting module:', err));
  }

  function handleDeleteCohort(cohortId) {
    if (!cohortId || !window.confirm('Are you sure you want to delete this cohort?')) return;

    fetch(`${API_URL}/cohorts/${cohortId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete cohort');
        fetchModulesAndCohorts();
      })
      .catch((err) => console.error('Error deleting cohort:', err));
  }

  if (loading) {
    return <div className="planner-view focused"><p>Loading modules and cohorts from database...</p></div>;
  }

  return (
    <div className="planner-view focused">
      <header className="planner-header">
        <div className="page-title-block">
          <h1>Modules &amp; cohorts</h1>
          <p>Organise academic modules and student cohorts from database records.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="planner-button" type="button" onClick={() => { closeCohortModal(); setIsCohortModalOpen(true); }} style={{ background: '#0f172a' }}>
            <span className="plus">+</span> Create cohort
          </button>
          <button className="planner-button" type="button" onClick={() => { closeModuleModal(); setIsModuleModalOpen(true); }}>
            <span className="plus">+</span> Create module
          </button>
        </div>
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
                <th style={{ paddingBottom: '12px', width: '25%' }}>Code</th>
                <th style={{ paddingBottom: '12px', width: '45%' }}>Module</th>
                <th style={{ paddingBottom: '12px', textAlign: 'right', width: '30%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.modules.map((mod, index) => (
                <tr key={mod.module_id || mod.code || index} style={{ borderBottom: index < data.modules.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '16px 0', fontWeight: 500, color: '#334155' }}>{mod.code || mod.module_code}</td>
                  <td style={{ padding: '16px 0', color: '#475569' }}>{mod.name || mod.module_name}</td>
                  <td style={{ padding: '16px 0', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button 
                      onClick={() => openEditModuleModal(mod)}
                      style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteModule(mod.module_id || mod.id)}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
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
            {data.cohorts.map((cohort, index) => (
              <div key={cohort.cohort_id || cohort.id || index} style={{ padding: '14px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '3px' }}>{cohort.name || cohort.cohort_name}</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Academic Year: {cohort.academicYear || cohort.academic_year || '2026'}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => openEditCohortModal(cohort)}
                    style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteCohort(cohort.cohort_id || cohort.id)}
                    style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Module Modal (Create / Edit) */}
      {isModuleModalOpen && (
        <div className="task-modal-backdrop" role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="task-modal panel" onSubmit={handleSaveModule} style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div className="task-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>{editingModuleId ? 'Edit module' : 'Create module'}</h2>
              <button className="modal-close" type="button" onClick={closeModuleModal} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
            </div>

            <div className="task-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <label className="task-form-field" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                Module Code (e.g. CMPG324)
                <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} required style={{ padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>
              <label className="task-form-field" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                Module Name
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>
            </div>

            <div className="task-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="modal-secondary-button" type="button" onClick={closeModuleModal} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button className="planner-button" type="submit" style={{ padding: '8px 16px', background: '#312e81', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editingModuleId ? 'Update module' : 'Save module'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Cohort Modal (Create / Edit) */}
      {isCohortModalOpen && (
        <div className="task-modal-backdrop" role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="task-modal panel" onSubmit={handleSaveCohort} style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div className="task-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>{editingCohortId ? 'Edit cohort' : 'Create cohort'}</h2>
              <button className="modal-close" type="button" onClick={closeCohortModal} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
            </div>

            <div className="task-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <label className="task-form-field" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                Cohort Name (e.g. BSc IT - First Year)
                <input type="text" value={newCohortName} onChange={(e) => setNewCohortName(e.target.value)} required style={{ padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>
              <label className="task-form-field" style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                Academic Year
                <input type="number" value={newAcademicYear} onChange={(e) => setNewAcademicYear(e.target.value)} required style={{ padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>
            </div>

            <div className="task-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="modal-secondary-button" type="button" onClick={closeCohortModal} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button className="planner-button" type="submit" style={{ padding: '8px 16px', background: '#312e81', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editingCohortId ? 'Update cohort' : 'Save cohort'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}