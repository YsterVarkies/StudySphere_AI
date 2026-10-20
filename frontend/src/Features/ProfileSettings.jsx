import React, { useState, useEffect } from 'react';

export default function ProfileSettings({ user, onUpdateUser }) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    surname: user?.surname || '',
    studentNumber: user?.studentNumber || user?.student_number || '',
    email: user?.email || '',
    yearOfStudy: user?.year_of_study || 3,
    cohortId: user?.cohort_id || '',
  });
  
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

 // Fetch user profile and cohorts on load
  useEffect(() => {
    async function loadProfileData() {
      try {
        const session = JSON.parse(localStorage.getItem('studysphere_session') || '{}');
        const token = session?.token;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

        // 1. Fetch public cohorts
        const cohortRes = await fetch(`${apiUrl}/cohorts/public`);
        const cohortData = await cohortRes.json();
        if (cohortRes.ok) {
          setCohorts(cohortData.cohorts || cohortData);
        }

        // 2. Fetch fresh user profile containing the student number
        if (token) {
          const userRes = await fetch(`${apiUrl}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const userData = await userRes.json();
          
          // Unwrap data correctly based on your controller's JSON response format
          const profile = userData.data || userData.user || userData;

          if (userRes.ok && profile) {
            setFormData({
              firstName: profile.firstName || profile.first_name || '',
              surname: profile.surname || profile.last_name || '',
              studentNumber: profile.studentNumber || profile.student_number || '',
              email: profile.email || '',
              yearOfStudy: profile.year_of_study || profile.yearOfStudy || 3,
              cohortId: profile.cohort_id || profile.cohortId || '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      }
    }
    loadProfileData();
  }, []);

  useEffect(() => {
    async function fetchCohorts() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/cohorts/public`);
        const data = await res.json();
        if (res.ok) {
          setCohorts(data.cohorts || data);
        }
      } catch (err) {
        console.error('Failed to load cohorts', err);
      }
    }
    fetchCohorts();
  }, []);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const session = JSON.parse(localStorage.getItem('studysphere_session') || '{}');
      const token = session?.token;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const res = await fetch(`${apiUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: formData.firstName.trim(),
          last_name: formData.surname.trim(),
          student_number: formData.studentNumber.trim(),
          email: formData.email.trim().toLowerCase(),
          cohort_id: formData.cohortId ? Number(formData.cohortId) : null,
          year_of_study: Number(formData.yearOfStudy)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile details.');
      }

      setMessage('Profile settings updated successfully!');
      
      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          firstName: formData.firstName.trim(),
          surname: formData.surname.trim(),
          studentNumber: formData.studentNumber.trim(),
          email: formData.email.trim().toLowerCase(),
          cohort_id: formData.cohortId ? Number(formData.cohortId) : null,
          year_of_study: Number(formData.yearOfStudy)
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="planner-view focused" style={{ maxWidth: '950px', margin: '0 auto', padding: '30px' }}>
      <header className="planner-header" style={{ marginBottom: '25px' }}>
        <div className="page-title-block">
          <h1 style={{ fontSize: '2rem' }}>Profile &amp; Settings</h1>
          <p style={{ fontSize: '1.05rem' }}>Update your personal information, student credentials, and academic progression.</p>
        </div>
      </header>

      <div className="task-panel panel" style={{ padding: '40px' }}>
        {error && (
          <div style={{ backgroundColor: '#ffe6e6', color: '#d9534f', padding: '15px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #f5c6cb', fontSize: '1rem' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ backgroundColor: '#e6f4ea', color: '#2e7d32', padding: '15px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #c3e6cb', fontSize: '1rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
            <label className="task-form-field" style={{ fontSize: '1rem' }}>
              First name
              <input 
                type="text" 
                value={formData.firstName} 
                onChange={(e) => updateField('firstName', e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label className="task-form-field" style={{ fontSize: '1rem' }}>
              Last name
              <input 
                type="text" 
                value={formData.surname} 
                onChange={(e) => updateField('surname', e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
            <label className="task-form-field" style={{ fontSize: '1rem' }}>
              Student number
              <input 
                type="text" 
                value={formData.studentNumber} 
                onChange={(e) => updateField('studentNumber', e.target.value)} 
                placeholder="Enter student number"
                required 
                style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label className="task-form-field" style={{ fontSize: '1rem' }}>
              Email address
              <input 
                type="email" 
                value={formData.email} 
                onChange={(e) => updateField('email', e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
            <label className="task-form-field" style={{ fontSize: '1rem' }}>
              Year of study
              <select 
                value={formData.yearOfStudy} 
                onChange={(e) => updateField('yearOfStudy', e.target.value)}
                style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', fontSize: '1rem' }}
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </label>

            <label className="task-form-field" style={{ fontSize: '1rem' }}>
              Academic cohort
              <select 
                value={formData.cohortId} 
                onChange={(e) => updateField('cohortId', e.target.value)}
                style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', fontSize: '1rem' }}
              >
                <option value="">Select a cohort...</option>
                {cohorts.map((c) => {
                  const id = c.cohort_id || c.id;
                  const name = c.cohort_name || c.name;
                  const year = c.academic_year || c.academicYear || '';
                  return (
                    <option key={id} value={id}>
                      {name} {year ? `(${year})` : ''}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
            <button 
              className="planner-button" 
              type="submit" 
              disabled={loading}
              style={{ padding: '14px 28px', fontSize: '1rem', cursor: 'pointer' }}
            >
              {loading ? 'Saving changes...' : 'Save profile changes'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}