import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Trash2, Loader2, Eye, ArrowLeft, FolderOpen, Briefcase, GraduationCap, Code } from 'lucide-react';

const DashboardPage = ({ onLoadResume }) => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/resumes/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/resumes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResumes(resumes.filter(r => r._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadResume = (resume) => {
    onLoadResume(resume.data, resume.keywords);
    navigate('/');
  };

  const filteredResumes = resumes.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStats = (resumeData) => ({
    experience: resumeData.experience?.length || 0,
    education: resumeData.education?.length || 0,
    projects: resumeData.projects?.length || 0
  });

  return (
    <div style={{ background: '#eef2f5', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'white',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontWeight: '500',
              color: '#1e3c72',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            <ArrowLeft size={18} /> Back to Editor
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FolderOpen size={28} color="#1e3c72" strokeWidth={1.8} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: '600', color: '#1e3c72', margin: 0 }}>Saved Resumes</h1>
            {!loading && (
              <span style={{
                background: '#1e3c72',
                color: 'white',
                fontSize: '0.75rem',
                padding: '2px 10px',
                borderRadius: '30px',
                marginLeft: '8px'
              }}>
                {filteredResumes.length} {filteredResumes.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'white',
          padding: '0.7rem 1.2rem',
          borderRadius: '48px',
          marginBottom: '2rem',
          maxWidth: '450px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search by resume name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: '#1e3c72' }} />
            <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading your resumes...</p>
          </div>
        ) : filteredResumes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <FolderOpen size={48} color="#cbd5e1" strokeWidth={1.2} />
            <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '1rem' }}>
              {searchTerm ? 'No matching resumes found.' : 'No saved resumes. Use "Cloud Save" from the editor.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.8rem'
          }}>
            {filteredResumes.map(resume => {
              const stats = getStats(resume.data);
              return (
                <div
                  key={resume._id}
                  style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    transition: 'all 0.25s ease',
                    border: '1px solid #eef2f5',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleLoadResume(resume)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 20px 25px -12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                  }}
                >
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      background: '#eef2ff',
                      padding: '10px',
                      borderRadius: '14px',
                      display: 'inline-flex'
                    }}>
                      <FileText size={22} color="#1e3c72" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '1.2rem', color: '#1e293b' }}>{resume.name}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                        {new Date(resume.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Stats chips (experience, education, projects) */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {stats.experience > 0 && (
                      <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Briefcase size={12} /> {stats.experience} exp
                      </span>
                    )}
                    {stats.education > 0 && (
                      <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <GraduationCap size={12} /> {stats.education} edu
                      </span>
                    )}
                    {stats.projects > 0 && (
                      <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Code size={12} /> {stats.projects} proj
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadResume(resume);
                      }}
                      style={{
                        flex: 1,
                        background: '#eef2ff',
                        color: '#1e3c72',
                        border: 'none',
                        padding: '0.6rem 0',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: '600',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e0e7ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#eef2ff'}
                    >
                      <Eye size={14} /> Load & Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteResume(resume._id, resume.name);
                      }}
                      style={{
                        flex: 1,
                        background: '#fff1f0',
                        color: '#dc2626',
                        border: 'none',
                        padding: '0.6rem 0',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: '600',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fff1f0'}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default DashboardPage;