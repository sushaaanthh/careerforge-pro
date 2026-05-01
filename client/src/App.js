import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import {
  Save, FolderOpen, FileDown, Sparkles, Search, Trash2,
  ArrowUp, ArrowDown, Plus, X, AlertCircle, CheckCircle, Info, FileText,
  Cloud, LogOut, Loader2, Crown
} from 'lucide-react';
import { useAuth } from './AuthContext';
import DashboardPage from './DashboardPage';
import './App.css';

const extractValues = (obj) => {
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
  if (Array.isArray(obj)) return obj.map(extractValues).join(' ');
  if (typeof obj === 'object' && obj !== null) return Object.values(obj).map(extractValues).join(' ');
  return '';
};

const TagInput = ({ value, onChange, placeholder }) => {
  const [tags, setTags] = useState(() => value ? value.split(',').map(t => t.trim()).filter(Boolean) : []);
  const [input, setInput] = useState('');
  useEffect(() => {
    setTags(value ? value.split(',').map(t => t.trim()).filter(Boolean) : []);
  }, [value]);
  const updateTags = (newTags) => {
    setTags(newTags);
    onChange(newTags.join(', '));
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = input.trim();
      if (newTag && !tags.includes(newTag)) {
        updateTags([...tags, newTag]);
      }
      setInput('');
    } else if (e.key === 'Backspace' && !input && tags.length) {
      updateTags(tags.slice(0, -1));
    }
  };
  const removeTag = (indexToRemove) => {
    updateTags(tags.filter((_, idx) => idx !== indexToRemove));
  };
  return (
    <div className="tag-input-container">
      <div className="tags-list">
        {tags.map((tag, idx) => (
          <span key={idx} className="tag">
            {tag}
            <button type="button" onClick={() => removeTag(idx)} className="tag-remove">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length ? "" : placeholder}
          className="tag-input"
        />
      </div>
    </div>
  );
};

const AtsGauge = ({ score }) => {
  const getColor = () => {
    if (score >= 70) return '#2ecc71';
    if (score >= 40) return '#f39c12';
    return '#e74c3c';
  };
  return (
    <div className="ats-gauge">
      <div className="gauge-circle">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e0e0e0" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={getColor()}
            strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 54 * score / 100} ${2 * Math.PI * 54}`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="gauge-text">
          <span className="gauge-score">{score}%</span>
          <span className="gauge-label">ATS Match</span>
        </div>
      </div>
    </div>
  );
};

const renderLatexText = (text) => {
  if (!text) return '';
  let processed = text.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
  processed = processed.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
  processed = processed.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
  processed = processed.replace(/\n/g, '<br />');
  return processed;
};

const UpgradePopup = ({ onClose, onUpgrade }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 10000
  }} onClick={onClose}>
    <div style={{
      background: 'white', borderRadius: '24px', padding: '2rem',
      maxWidth: '400px', textAlign: 'center', position: 'relative'
    }} onClick={e => e.stopPropagation()}>
      <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
        <X size={20} />
      </button>
      <Crown size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
      <h2 style={{ color: '#1e3c72', marginBottom: '0.5rem' }}>Upgrade to Pro</h2>
      <p style={{ color: '#5b6e8c', marginBottom: '1rem' }}>
        Free plan allows only one PDF resume. Upgrade for unlimited resumes, cloud storage, cover letters, and advanced features.
      </p>
      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>
        Only $9.99/month - cancel anytime
      </p>
      <button
        onClick={onUpgrade}
        style={{
          background: '#1e3c72', color: 'white', border: 'none',
          padding: '0.75rem 1.5rem', borderRadius: '40px', fontSize: '1rem',
          fontWeight: '600', cursor: 'pointer', width: '100%'
        }}
      >
        Upgrade Now
      </button>
    </div>
  </div>
);

const EditorScreen = ({
  user, resumeData, setResumeData, jobDescription, setJobDescription,
  targetKeywords, atsScore, isAnalyzingJD, isOptimizing, isGeneratingPDF,
  isGeneratingCoverLetter, notification, showCoverLetterModal, coverLetter,
  onSaveResume, onLoadResume, onCloudSave, onNavigateDashboard, onGenerateCoverLetter,
  onDownloadPDF, onUpgradeClick, onLogout, onAnalyzeJD, onClearKeywords, onOptimize,
  onAddEntry, onUpdateEntry, onDeleteEntry, onMoveEntry, onCloseCoverLetterModal,
  previewRef, renderEntryHeader, isKeywordFound
}) => (
  <div className="app-container">
    {notification.show && (
      <div className={`toast-notification ${notification.type}`}>
        {notification.type === 'success' && <CheckCircle size={16} style={{ marginRight: 8 }} />}
        {notification.type === 'error' && <AlertCircle size={16} style={{ marginRight: 8 }} />}
        {notification.type === 'warning' && <AlertCircle size={16} style={{ marginRight: 8 }} />}
        {notification.type === 'info' && <Info size={16} style={{ marginRight: 8 }} />}
        {notification.message}
      </div>
    )}

    <div className="top-bar no-print">
      <div className="logo">
        <FileText size={22} style={{ marginRight: 8 }} />
        <span className="logo-text">Resume Architect</span>
      </div>
      <div className="top-actions">
        <button onClick={onSaveResume} className="action-btn"><Save size={16} style={{ marginRight: 6 }} /> Local Save</button>
        <button onClick={onLoadResume} className="action-btn"><FolderOpen size={16} style={{ marginRight: 6 }} /> Local Load</button>
        {user?.plan === 'pro' && (
          <>
            <button onClick={onCloudSave} className="action-btn"><Cloud size={16} style={{ marginRight: 6 }} /> Cloud Save</button>
            <button onClick={onNavigateDashboard} className="action-btn"><FolderOpen size={16} style={{ marginRight: 6 }} /> Dashboard</button>
            <button onClick={onGenerateCoverLetter} disabled={isGeneratingCoverLetter} className="action-btn">
              <FileText size={16} style={{ marginRight: 6 }} />
              {isGeneratingCoverLetter ? 'Generating...' : 'Cover Letter'}
            </button>
          </>
        )}
        <button onClick={onDownloadPDF} disabled={isGeneratingPDF} className="action-btn primary">
          <FileDown size={16} style={{ marginRight: 6 }} />
          {isGeneratingPDF ? 'Generating...' : 'PDF'}
        </button>
        {user?.plan === 'free' && (
          <button onClick={onUpgradeClick} className="action-btn" style={{ background: '#fef3c7', color: '#92400e' }}>
            <Crown size={16} style={{ marginRight: 6 }} /> Upgrade
          </button>
        )}
        <button onClick={onLogout} className="action-btn" style={{ background: '#fee2e2', color: '#991b1b' }}><LogOut size={16} style={{ marginRight: 6 }} /> Logout</button>
      </div>
      <div style={{ fontSize: '0.8rem', marginLeft: 'auto', marginRight: '1rem' }}>
        Plan: <strong style={{ color: user?.plan === 'pro' ? '#2ecc71' : '#f39c12' }}>{user?.plan === 'pro' ? 'Pro' : 'Free'}</strong>
        {user?.plan === 'free' && <span style={{ fontSize: '0.7rem', marginLeft: '8px' }}>(1 PDF limit)</span>}
      </div>
    </div>

    <div className="main-layout">
      <div className="editor-panel no-print">
        <div className="editor-card jd-card">
          <h3 className="card-title">Job Description Analysis</h3>
          <textarea
            className="jd-textarea"
            placeholder="Paste target Job Description here to extract keywords..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={4}
          />
          <div className="button-group">
            <button className="btn-primary" onClick={onAnalyzeJD} disabled={isAnalyzingJD}>
              <Search size={16} style={{ marginRight: 6 }} />
              {isAnalyzingJD ? 'Analyzing...' : 'Extract Keywords'}
            </button>
            {targetKeywords.length > 0 && (
              <button className="btn-secondary" onClick={onClearKeywords}>Clear</button>
            )}
          </div>
          {targetKeywords.length > 0 && (
            <div className="keywords-section">
              <div className="ats-header">
                <strong>ATS Match Score</strong>
                <AtsGauge score={atsScore} />
              </div>
              <div className="keywords-list">
                {targetKeywords.map((kw, i) => (
                  <span key={i} className={`keyword-chip ${isKeywordFound(kw) ? 'found' : 'missing'}`}>
                    {kw}
                    {!isKeywordFound(kw) && <span className="missing-badge">●</span>}
                  </span>
                ))}
              </div>
              <div className="missing-hint">
                {targetKeywords.filter(kw => !isKeywordFound(kw)).length} keywords missing
              </div>
            </div>
          )}
        </div>

        <div className="editor-card">
          <h3 className="card-title">Personal Information</h3>
          <input type="text" placeholder="Full Name" value={resumeData.name} onChange={(e) => setResumeData({ ...resumeData, name: e.target.value })} className="form-input" />
          <input type="email" placeholder="Email Address" value={resumeData.email} onChange={(e) => setResumeData({ ...resumeData, email: e.target.value })} className="form-input" />
        </div>

        <div className="editor-card">
          <h3 className="card-title">Education</h3>
          {resumeData.education.map((edu, i) => (
            <div key={i} className="entry-card">
              {renderEntryHeader('education', i)}
              <input placeholder="University Name" value={edu.school} onChange={(e) => onUpdateEntry('education', i, 'school', e.target.value)} className="form-input" />
              <div className="row-inputs">
                <input placeholder="City" value={edu.city} onChange={(e) => onUpdateEntry('education', i, 'city', e.target.value)} />
                <input placeholder="Country" value={edu.country} onChange={(e) => onUpdateEntry('education', i, 'country', e.target.value)} />
              </div>
              <input placeholder="Degree / Specialization" value={edu.degree} onChange={(e) => onUpdateEntry('education', i, 'degree', e.target.value)} className="form-input" />
              <div className="row-inputs">
                <input placeholder="Grades / CGPA" value={edu.grades} onChange={(e) => onUpdateEntry('education', i, 'grades', e.target.value)} />
                <input placeholder="Date Range" value={edu.date} onChange={(e) => onUpdateEntry('education', i, 'date', e.target.value)} />
              </div>
            </div>
          ))}
          <button className="add-btn" onClick={() => onAddEntry('education', { school:'', city:'', country:'', degree:'', grades:'', date:'' })}><Plus size={14} style={{ marginRight: 6 }} /> Add Education</button>
        </div>

        <div className="editor-card">
          <h3 className="card-title">Technical Skills</h3>
          {resumeData.skills.map((skill, i) => (
            <div key={i} className="skill-group">
              <div className="skill-header">
                <input placeholder="Category (e.g., Programming Languages)" value={skill.category} onChange={(e) => onUpdateEntry('skills', i, 'category', e.target.value)} className="category-input" />
                <button onClick={() => onDeleteEntry('skills', i)} className="icon-btn delete"><Trash2 size={14} /></button>
              </div>
              <TagInput value={skill.items} onChange={(val) => onUpdateEntry('skills', i, 'items', val)} placeholder="Enter skills (comma or Enter)" />
            </div>
          ))}
          <button className="add-btn" onClick={() => onAddEntry('skills', { category: '', items: '' })}><Plus size={14} style={{ marginRight: 6 }} /> Add Skill Category</button>
        </div>

        <div className="editor-card">
          <h3 className="card-title">Work Experience</h3>
          {resumeData.experience.map((exp, i) => (
            <div key={i} className="entry-card">
              {renderEntryHeader('experience', i)}
              <div className="row-inputs">
                <input placeholder="Role" value={exp.role} onChange={(e) => onUpdateEntry('experience', i, 'role', e.target.value)} />
                <input placeholder="Company" value={exp.company} onChange={(e) => onUpdateEntry('experience', i, 'company', e.target.value)} />
              </div>
              <input placeholder="Date Range" value={exp.date} onChange={(e) => onUpdateEntry('experience', i, 'date', e.target.value)} className="form-input" />
              <textarea placeholder="Description of responsibilities and achievements..." value={exp.desc} onChange={(e) => onUpdateEntry('experience', i, 'desc', e.target.value)} rows={3} className="form-textarea" />
              <button className="optimize-btn" disabled={isOptimizing.section === 'experience' && isOptimizing.index === i} onClick={() => onOptimize('experience', i, exp.desc)}>
                <Sparkles size={14} style={{ marginRight: 6 }} />
                {isOptimizing.section === 'experience' && isOptimizing.index === i ? 'Optimizing...' : 'AI Optimize'}
              </button>
            </div>
          ))}
          <button className="add-btn" onClick={() => onAddEntry('experience', { company:'', role:'', date:'', desc:'' })}><Plus size={14} style={{ marginRight: 6 }} /> Add Experience</button>
        </div>

        <div className="editor-card">
          <h3 className="card-title">Technical Projects</h3>
          {resumeData.projects.map((proj, i) => (
            <div key={i} className="entry-card">
              {renderEntryHeader('projects', i)}
              <input placeholder="Project Name" value={proj.name} onChange={(e) => onUpdateEntry('projects', i, 'name', e.target.value)} className="form-input" />
              <textarea placeholder="Project description, technologies used, and outcomes..." value={proj.desc} onChange={(e) => onUpdateEntry('projects', i, 'desc', e.target.value)} rows={3} className="form-textarea" />
              <button className="optimize-btn" disabled={isOptimizing.section === 'projects' && isOptimizing.index === i} onClick={() => onOptimize('projects', i, proj.desc)}>
                <Sparkles size={14} style={{ marginRight: 6 }} />
                {isOptimizing.section === 'projects' && isOptimizing.index === i ? 'Optimizing...' : 'AI Optimize'}
              </button>
            </div>
          ))}
          <button className="add-btn" onClick={() => onAddEntry('projects', { name:'', desc:'' })}><Plus size={14} style={{ marginRight: 6 }} /> Add Project</button>
        </div>
      </div>

      <div className="preview latex-font" ref={previewRef}>
        <div className="resume-paper">
          <header className="resume-header">
            <h1 dangerouslySetInnerHTML={{ __html: renderLatexText(resumeData.name || "YOUR NAME") }} />
            <p>{resumeData.email}</p>
          </header>
          <section className="section">
            <div className="section-title">EDUCATION</div>
            {resumeData.education.map((edu, i) => (
              <div key={i} className="entry">
                <div className="entry-header">
                  <strong dangerouslySetInnerHTML={{ __html: renderLatexText(edu.school || "UNIVERSITY NAME") }} />
                  <strong>{edu.city}{edu.city && edu.country ? ', ' : ''}{edu.country}</strong>
                </div>
                <div className="entry-sub">
                  <em dangerouslySetInnerHTML={{ __html: renderLatexText(`${edu.degree}${edu.grades ? `; CGPA: ${edu.grades}` : ''}`) }} />
                  <span>{edu.date}</span>
                </div>
              </div>
            ))}
          </section>
          <section className="section">
            <div className="section-title">TECHNICAL SKILLS</div>
            <div className="entry" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {resumeData.skills.map((skill, i) => (
                skill.category || skill.items ? (
                  <div key={i} style={{ fontSize: '10pt' }}>
                    <strong dangerouslySetInnerHTML={{ __html: renderLatexText(skill.category) }} />:
                    <span dangerouslySetInnerHTML={{ __html: renderLatexText(skill.items) }} />
                  </div>
                ) : null
              ))}
            </div>
          </section>
          <section className="section">
            <div className="section-title">WORK EXPERIENCE</div>
            {resumeData.experience.map((exp, i) => (
              <div key={i} className="entry">
                <div className="entry-header">
                  <strong>● {exp.role} – {exp.company}</strong>
                  <strong>{exp.date}</strong>
                </div>
                <p className="entry-desc" dangerouslySetInnerHTML={{ __html: renderLatexText(exp.desc) }} />
              </div>
            ))}
          </section>
          <section className="section">
            <div className="section-title">TECHNICAL PROJECTS</div>
            {resumeData.projects.map((proj, i) => (
              <div key={i} className="entry">
                <strong dangerouslySetInnerHTML={{ __html: renderLatexText(proj.name) }} />
                <p className="entry-desc" dangerouslySetInnerHTML={{ __html: renderLatexText(proj.desc) }} />
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>

    {showCoverLetterModal && (
      <div className="modal-overlay" onClick={() => onCloseCoverLetterModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>Generated Cover Letter</h3>
          <div style={{ whiteSpace: 'pre-wrap', maxHeight: '60vh', overflowY: 'auto', marginBottom: '1rem' }}>
            {coverLetter}
          </div>
          <button onClick={() => onCloseCoverLetterModal(false)} className="btn-primary">Close</button>
        </div>
      </div>
    )}
  </div>
);

const App = () => {
  const { user, login, signup, logout, upgradeToPro, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');

  const [resumeData, setResumeData] = useState({
    name: '',
    email: '',
    education: [{ school: '', city: '', country: '', degree: '', grades: '', date: '' }],
    experience: [{ company: '', role: '', date: '', desc: '' }],
    projects: [{ name: '', desc: '' }],
    skills: [{ category: '', items: '' }]
  });
  const [jobDescription, setJobDescription] = useState('');
  const [targetKeywords, setTargetKeywords] = useState([]);
  const [atsScore, setAtsScore] = useState(0);
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState({ section: null, index: null });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const previewRef = useRef(null);

  const [coverLetter, setCoverLetter] = useState('');
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);

  const fullResumeText = useMemo(() => extractValues(resumeData).toLowerCase(), [resumeData]);
  useEffect(() => {
    if (targetKeywords.length === 0) {
      setAtsScore(0);
      return;
    }
    let matches = 0;
    targetKeywords.forEach(keyword => {
      if (fullResumeText.includes(keyword.toLowerCase())) matches++;
    });
    setAtsScore(Math.round((matches / targetKeywords.length) * 100));
  }, [fullResumeText, targetKeywords]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId && user && user.plan !== 'pro') {
      const interval = setInterval(async () => {
        try {
          const storedToken = localStorage.getItem('token');
          const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          const userData = await res.json();
          if (userData.plan === 'pro') {
            clearInterval(interval);
            window.location.href = '/';
          }
        } catch (err) { console.error(err); }
      }, 2000);
      setTimeout(() => clearInterval(interval), 30000);
    }
  }, [user]);

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const addEntry = (section, template) => {
    setResumeData({ ...resumeData, [section]: [...resumeData[section], template] });
    showNotification(`Added new ${section} entry`, 'success');
  };
  const updateEntry = (section, index, field, value) => {
    const updatedSection = [...resumeData[section]];
    updatedSection[index][field] = value;
    setResumeData({ ...resumeData, [section]: updatedSection });
  };
  const deleteEntry = (section, index) => {
    if (resumeData[section].length === 1) {
      showNotification(`Cannot delete the last ${section} entry`, 'warning');
      return;
    }
    const updatedSection = resumeData[section].filter((_, i) => i !== index);
    setResumeData({ ...resumeData, [section]: updatedSection });
    showNotification(`Deleted ${section} entry`, 'success');
  };
  const moveEntry = (section, index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= resumeData[section].length) return;
    const updatedSection = [...resumeData[section]];
    [updatedSection[index], updatedSection[newIndex]] = [updatedSection[newIndex], updatedSection[index]];
    setResumeData({ ...resumeData, [section]: updatedSection });
  };

  const handleAnalyzeJD = async () => {
    if (!jobDescription.trim()) {
      showNotification('Please paste a job description', 'warning');
      return;
    }
    setIsAnalyzingJD(true);
    try {
      const response = await fetch("http://localhost:5000/api/analyze-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: jobDescription })
      });
      const data = await response.json();
      if (response.ok && data.keywords) {
        setTargetKeywords(data.keywords);
        showNotification(`Extracted ${data.keywords.length} keywords`, 'success');
      } else {
        showNotification(`Error: ${data.error || "Unknown error"}`, 'error');
      }
    } catch (error) {
      showNotification("Network Error: Could not reach the AI Server.", 'error');
    } finally {
      setIsAnalyzingJD(false);
    }
  };

  const handleOptimize = async (section, index, text) => {
    if (!text || text.trim() === '') {
      showNotification('No description to optimize', 'warning');
      return;
    }
    if (targetKeywords.length === 0) {
      showNotification('Please extract keywords first', 'warning');
      return;
    }
    setIsOptimizing({ section, index });
    try {
      const response = await fetch("http://localhost:5000/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sectionType: section, targetKeywords })
      });
      const data = await response.json();
      if (response.ok && data.optimizedText) {
        updateEntry(section, index, 'desc', data.optimizedText);
        showNotification('Description optimized successfully', 'success');
      } else {
        showNotification("Optimization failed.", 'error');
      }
    } catch (error) {
      showNotification("Could not connect to server.", 'error');
    } finally {
      setIsOptimizing({ section: null, index: null });
    }
  };

  const clearKeywords = () => {
    setTargetKeywords([]);
    setJobDescription('');
    showNotification('Keywords cleared', 'info');
  };

  const saveResumeLocally = () => {
    localStorage.setItem('savedResume', JSON.stringify(resumeData));
    localStorage.setItem('savedKeywords', JSON.stringify(targetKeywords));
    showNotification('Resume saved locally', 'success');
  };
  const loadResumeLocally = () => {
    const saved = localStorage.getItem('savedResume');
    const savedKeywords = localStorage.getItem('savedKeywords');
    if (saved) {
      setResumeData(JSON.parse(saved));
      if (savedKeywords) setTargetKeywords(JSON.parse(savedKeywords));
      showNotification('Resume loaded', 'success');
    } else {
      showNotification('No saved resume found', 'info');
    }
  };

  const isKeywordFound = useCallback((keyword) => fullResumeText.includes(keyword.toLowerCase()), [fullResumeText]);

  const downloadPDFWithPuppeteer = async () => {
    const previewElement = previewRef.current;
    if (!previewElement) {
      showNotification('Preview not found', 'error');
      return;
    }
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      showNotification('You must be logged in', 'error');
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const clonePreview = previewElement.cloneNode(true);
      const styleTags = document.querySelectorAll('style');
      let uniqueStyles = '';
      const styleContents = new Set();
      styleTags.forEach(style => {
        const content = style.innerHTML;
        if (!styleContents.has(content)) {
          styleContents.add(content);
          uniqueStyles += content;
        }
      });
      const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
      let linkHtml = '';
      linkTags.forEach(link => {
        if (link.href.includes('localhost') || link.href.includes('/static/')) {
          linkHtml += `<link rel="stylesheet" href="${link.href}">`;
        }
      });
      const widthOverrides = `
        <style>
          .preview { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 15px !important; box-sizing: border-box !important; }
          .resume-paper { max-width: 100% !important; width: 100% !important; padding: 20px 20px !important; margin: 0 auto !important; box-sizing: border-box !important; }
          body { margin: 0 !important; padding: 0 !important; background: white; }
          @media print {
            .section, .entry { break-inside: avoid; page-break-inside: avoid; }
            h1, h2, h3, .section-title { break-after: avoid; page-break-after: avoid; }
            @page { size: A4; margin: 0.75in; }
          }
        </style>
      `;
      const fullHTML = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8"><title>${resumeData.name || 'Resume'}</title>${linkHtml}<style>${uniqueStyles}</style>${widthOverrides}</head>
          <body>${clonePreview.outerHTML}</body>
        </html>
      `;
      const response = await fetch('http://localhost:5000/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${storedToken}` },
        body: JSON.stringify({ htmlContent: fullHTML })
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.error && errorData.error.includes('Free plan')) {
          setShowUpgradePopup(true);
          throw new Error('Free limit reached');
        }
        throw new Error(errorData.error || 'PDF generation failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resumeData.name || 'Resume'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showNotification('PDF generated successfully', 'success');
    } catch (error) {
      if (!error.message.includes('Free limit reached')) {
        showNotification(error.message || 'Failed to generate PDF', 'error');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateCoverLetter = async () => {
    if (user?.plan !== 'pro') {
      setShowUpgradePopup(true);
      return;
    }
    if (!jobDescription.trim()) {
      showNotification('Please paste a job description first', 'warning');
      return;
    }
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      showNotification('You must be logged in', 'error');
      return;
    }
    setIsGeneratingCoverLetter(true);
    try {
      const response = await fetch('http://localhost:5000/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${storedToken}` },
        body: JSON.stringify({ resumeData, jobDescription, targetKeywords })
      });
      const data = await response.json();
      if (response.ok) {
        setCoverLetter(data.coverLetter);
        setShowCoverLetterModal(true);
      } else {
        showNotification(data.error || 'Failed to generate cover letter', 'error');
      }
    } catch (err) {
      showNotification('Network error', 'error');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const saveCurrentResumeToCloud = async () => {
    if (user?.plan !== 'pro') {
      setShowUpgradePopup(true);
      return;
    }
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      showNotification('You must be logged in', 'error');
      return;
    }
    const name = prompt('Enter a name for this resume:', new Date().toLocaleString());
    if (!name) return;
    try {
      const response = await fetch('http://localhost:5000/api/resumes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`
        },
        body: JSON.stringify({
          name,
          resumeData,
          keywords: targetKeywords,
          jobDescription: jobDescription
        })
      });
      if (response.ok) {
        showNotification('Resume saved to cloud', 'success');
      } else if (response.status === 403) {
        setShowUpgradePopup(true);
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to save', 'error');
      }
    } catch (err) {
      showNotification('Network error', 'error');
    }
  };

  const handleLoadResumeFromDashboard = (data, keywords) => {
    setResumeData(data);
    if (keywords) setTargetKeywords(keywords);
    showNotification('Resume loaded from cloud', 'success');
    navigate('/');
  };

  const renderEntryHeader = (section, index) => (
    <div className="entry-header">
      <span className="entry-number">#{index+1}</span>
      <div className="entry-actions">
        <button onClick={() => moveEntry(section, index, 'up')} className="icon-btn" disabled={index===0}><ArrowUp size={14} /></button>
        <button onClick={() => moveEntry(section, index, 'down')} className="icon-btn" disabled={index===resumeData[section].length-1}><ArrowDown size={14} /></button>
        <button onClick={() => deleteEntry(section, index)} className="icon-btn delete"><Trash2 size={14} /></button>
      </div>
    </div>
  );

  const handleLogout = () => {
    setResumeData({
      name: '',
      email: '',
      education: [{ school: '', city: '', country: '', degree: '', grades: '', date: '' }],
      experience: [{ company: '', role: '', date: '', desc: '' }],
      projects: [{ name: '', desc: '' }],
      skills: [{ category: '', items: '' }]
    });
    setJobDescription('');
    setTargetKeywords([]);
    setCoverLetter('');
    setShowCoverLetterModal(false);
    setIsAnalyzingJD(false);
    setIsOptimizing({ section: null, index: null });
    setIsGeneratingPDF(false);
    setIsGeneratingCoverLetter(false);
    setShowUpgradePopup(false);
    localStorage.removeItem('savedResume');
    localStorage.removeItem('savedKeywords');
    logout();
    window.location.href = '/';
  };

  const handleAuthSubmit = async () => {
    setAuthError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError('Please fill in both email and password.');
      return;
    }
    try {
      if (isLogin) {
        await login(loginEmail, loginPassword);
      } else {
        await signup(loginEmail, loginPassword);
      }
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message || 'Authentication failed. Please try again.');
    }
  };

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '1rem'
      }}>
        <div style={{
          display: 'flex',
          maxWidth: '1200px',
          width: '100%',
          background: 'white',
          borderRadius: '32px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}>
          {/* Left side - Hero */}
          <div style={{
            flex: 1,
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            padding: '3rem',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <FileText size={48} style={{ marginBottom: '1rem' }} />
              <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', lineHeight: '1.2' }}>
                Resume Architect
              </h1>
              <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem' }}>
                Build ATS-optimized resumes that get noticed. AI-powered rewrites, professional LaTeX formatting, and instant PDF export.
              </p>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Why users love it</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} /> Extract keywords from any job description
                </li>
                <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} /> AI rewrite using STAR method
                </li>
                <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} /> LaTeX-inspired one-page PDFs
                </li>
                <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} /> Free tier includes 1 full resume PDF
                </li>
              </ul>
            </div>
          </div>

          {/* Right side - Auth form */}
          <div style={{
            flex: 0.8,
            padding: '3rem',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{ color: '#64748b' }}>
                {isLogin ? 'Sign in to continue building your resume' : 'Start your free trial – no credit card required'}
              </p>
            </div>

            {authError && (
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '0.75rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                {authError}
              </div>
            )}

            <input
              type="email"
              placeholder="Email address"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.9rem 1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                marginBottom: '1rem',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#1e3c72'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.9rem 1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                fontSize: '1rem',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#1e3c72'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
            />
            <button
              onClick={handleAuthSubmit}
              style={{
                width: '100%',
                background: '#1e3c72',
                color: 'white',
                border: 'none',
                padding: '0.9rem',
                borderRadius: '40px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.1s, background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0f2b4f'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1e3c72'}
            >
              {isLogin ? 'Sign in' : 'Create free account'}
            </button>

            <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => { setIsLogin(!isLogin); setAuthError(''); }}
                  style={{
                    color: '#1e3c72',
                    textDecoration: 'none',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {isLogin ? 'Sign up for free' : 'Sign in'}
                </button>
              </p>
            </div>

            {!isLogin && (
              <p style={{ fontSize: '0.7rem', textAlign: 'center', color: '#94a3b8', marginTop: '1rem' }}>
                By signing up you agree to our Terms and Privacy Policy.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={
          <EditorScreen
            user={user}
            resumeData={resumeData}
            setResumeData={setResumeData}
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            targetKeywords={targetKeywords}
            atsScore={atsScore}
            isAnalyzingJD={isAnalyzingJD}
            isOptimizing={isOptimizing}
            isGeneratingPDF={isGeneratingPDF}
            isGeneratingCoverLetter={isGeneratingCoverLetter}
            notification={notification}
            showCoverLetterModal={showCoverLetterModal}
            coverLetter={coverLetter}
            onSaveResume={saveResumeLocally}
            onLoadResume={loadResumeLocally}
            onCloudSave={saveCurrentResumeToCloud}
            onNavigateDashboard={() => navigate('/dashboard')}
            onGenerateCoverLetter={generateCoverLetter}
            onDownloadPDF={downloadPDFWithPuppeteer}
            onUpgradeClick={() => setShowUpgradePopup(true)}
            onLogout={handleLogout}
            onAnalyzeJD={handleAnalyzeJD}
            onClearKeywords={clearKeywords}
            onOptimize={handleOptimize}
            onAddEntry={addEntry}
            onUpdateEntry={updateEntry}
            onDeleteEntry={deleteEntry}
            onMoveEntry={moveEntry}
            onCloseCoverLetterModal={setShowCoverLetterModal}
            previewRef={previewRef}
            renderEntryHeader={renderEntryHeader}
            isKeywordFound={isKeywordFound}
          />
        } />
        <Route path="/dashboard" element={
          user?.plan === 'pro' ? <DashboardPage onLoadResume={handleLoadResumeFromDashboard} /> : <Navigate to="/" replace />
        } />
      </Routes>
      {showUpgradePopup && <UpgradePopup onClose={() => setShowUpgradePopup(false)} onUpgrade={() => { setShowUpgradePopup(false); upgradeToPro(); }} />}
    </>
  );
};

export default App;