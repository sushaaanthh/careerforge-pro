import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Save, FolderOpen, FileDown, Sparkles, Search, Trash2,
  ArrowUp, ArrowDown, Plus, X, AlertCircle, CheckCircle, Info, FileText
} from 'lucide-react';
import './App.css';

// extracts all text from resume data for ATS matching
const extractValues = (obj) => {
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
  if (Array.isArray(obj)) return obj.map(extractValues).join(' ');
  if (typeof obj === 'object' && obj !== null) return Object.values(obj).map(extractValues).join(' ');
  return '';
};

// for Skills
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

// ATS Score Gauge Component
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

// Convert LaTeX-style text commands to HTML
const renderLatexText = (text) => {
  if (!text) return '';

  let processed = text.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
  processed = processed.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
  processed = processed.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
  processed = processed.replace(/\n/g, '<br />');

  return processed;
};

// Main App Component
const App = () => {
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false); // NEW: PDF generation state

  const previewRef = useRef(null); // NEW: reference to the preview div

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

  const saveResume = () => {
    localStorage.setItem('savedResume', JSON.stringify(resumeData));
    localStorage.setItem('savedKeywords', JSON.stringify(targetKeywords));
    showNotification('Resume saved locally', 'success');
  };

  const loadResume = () => {
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

  // NEW: Puppeteer PDF generation function
    const downloadPDFWithPuppeteer = async () => {
    const previewElement = previewRef.current;
    if (!previewElement) {
        showNotification('Preview not found', 'error');
        return;
    }

    setIsGeneratingPDF(true);

    // Clone the preview
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
        /* Force full width and equal side margins */
        .preview {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 15px !important;   /* equal left & right padding */
        box-sizing: border-box !important;
        }
        .resume-paper {
        max-width: 100% !important;
        width: 100% !important;
        padding: 20px 20px !important;  /* equal left & right */
        margin: 0 auto !important;
        box-sizing: border-box !important;
        }
        body {
        margin: 0 !important;
        padding: 0 !important;
        background: white;
        }
        @media print {
        .section {
            break-inside: avoid;        /* keep whole section together */
            page-break-inside: avoid;
        }
        .entry {
            break-inside: avoid;
            page-break-inside: avoid;
        }
        h1, h2, h3, .section-title {
            break-after: avoid;
            page-break-after: avoid;
        }
        }
    </style>
    `;

    const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <title>${resumeData.name || 'Resume'}</title>
        ${linkHtml}
        <style>${uniqueStyles}</style>
        ${widthOverrides}
        </head>
        <body>
        ${clonePreview.outerHTML}
        </body>
        </html>
    `;

    try {
        const response = await fetch('http://localhost:5000/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: fullHTML })
        });

        if (!response.ok) {
        const errorData = await response.json();
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
        console.error('PDF generation error:', error);
        showNotification(error.message || 'Failed to generate PDF', 'error');
    } finally {
        setIsGeneratingPDF(false);
    }
    };

  return (
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

      {/* Top Bar */}
      <div className="top-bar no-print">
        <div className="logo">
          <FileText size={22} style={{ marginRight: 8 }} />
          <span className="logo-text">Resume Architect</span>
        </div>
        <div className="top-actions">
          <button onClick={saveResume} className="action-btn"><Save size={16} style={{ marginRight: 6 }} /> Save</button>
          <button onClick={loadResume} className="action-btn"><FolderOpen size={16} style={{ marginRight: 6 }} /> Load</button>
          <button onClick={downloadPDFWithPuppeteer} className="action-btn primary" disabled={isGeneratingPDF}>
            <FileDown size={16} style={{ marginRight: 6 }} />
            {isGeneratingPDF ? 'Generating...' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="main-layout">
        {/* LEFT PANEL - EDITOR */}
        <div className="editor-panel no-print">
          {/* JD Analysis Card */}
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
              <button className="btn-primary" onClick={handleAnalyzeJD} disabled={isAnalyzingJD}>
                <Search size={16} style={{ marginRight: 6 }} />
                {isAnalyzingJD ? 'Analyzing...' : 'Extract Keywords'}
              </button>
              {targetKeywords.length > 0 && (
                <button className="btn-secondary" onClick={clearKeywords}>Clear</button>
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

          {/* Personal Info */}
          <div className="editor-card">
            <h3 className="card-title">Personal Information</h3>
            <input type="text" placeholder="Full Name" value={resumeData.name} onChange={(e) => setResumeData({...resumeData, name: e.target.value})} className="form-input" />
            <input type="email" placeholder="Email Address" value={resumeData.email} onChange={(e) => setResumeData({...resumeData, email: e.target.value})} className="form-input" />
          </div>

          {/* Education */}
          <div className="editor-card">
            <h3 className="card-title">Education</h3>
            {resumeData.education.map((edu, i) => (
              <div key={i} className="entry-card">
                <div className="entry-header">
                  <span className="entry-number">#{i+1}</span>
                  <div className="entry-actions">
                    <button onClick={() => moveEntry('education', i, 'up')} className="icon-btn" disabled={i===0}><ArrowUp size={14} /></button>
                    <button onClick={() => moveEntry('education', i, 'down')} className="icon-btn" disabled={i===resumeData.education.length-1}><ArrowDown size={14} /></button>
                    <button onClick={() => deleteEntry('education', i)} className="icon-btn delete"><Trash2 size={14} /></button>
                  </div>
                </div>
                <input placeholder="University Name" value={edu.school} onChange={(e) => updateEntry('education', i, 'school', e.target.value)} className="form-input" />
                <div className="row-inputs">
                  <input placeholder="City" value={edu.city} onChange={(e) => updateEntry('education', i, 'city', e.target.value)} />
                  <input placeholder="Country" value={edu.country} onChange={(e) => updateEntry('education', i, 'country', e.target.value)} />
                </div>
                <input placeholder="Degree / Specialization" value={edu.degree} onChange={(e) => updateEntry('education', i, 'degree', e.target.value)} className="form-input" />
                <div className="row-inputs">
                  <input placeholder="Grades / CGPA" value={edu.grades} onChange={(e) => updateEntry('education', i, 'grades', e.target.value)} />
                  <input placeholder="Date Range" value={edu.date} onChange={(e) => updateEntry('education', i, 'date', e.target.value)} />
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={() => addEntry('education', { school:'', city:'', country:'', degree:'', grades:'', date:'' })}><Plus size={14} style={{ marginRight: 6 }} /> Add Education</button>
          </div>

          {/* Skills */}
          <div className="editor-card">
            <h3 className="card-title">Technical Skills</h3>
            {resumeData.skills.map((skill, i) => (
              <div key={i} className="skill-group">
                <div className="skill-header">
                  <input placeholder="Category (e.g., Programming Languages)" value={skill.category} onChange={(e) => updateEntry('skills', i, 'category', e.target.value)} className="category-input" />
                  <button onClick={() => deleteEntry('skills', i)} className="icon-btn delete"><Trash2 size={14} /></button>
                </div>
                <TagInput value={skill.items} onChange={(val) => updateEntry('skills', i, 'items', val)} placeholder="Enter skills (comma or Enter)" />
              </div>
            ))}
            <button className="add-btn" onClick={() => addEntry('skills', { category: '', items: '' })}><Plus size={14} style={{ marginRight: 6 }} /> Add Skill Category</button>
          </div>

          {/* Experience */}
          <div className="editor-card">
            <h3 className="card-title">Work Experience</h3>
            {resumeData.experience.map((exp, i) => (
              <div key={i} className="entry-card">
                <div className="entry-header">
                  <span className="entry-number">#{i+1}</span>
                  <div className="entry-actions">
                    <button onClick={() => moveEntry('experience', i, 'up')} className="icon-btn" disabled={i===0}><ArrowUp size={14} /></button>
                    <button onClick={() => moveEntry('experience', i, 'down')} className="icon-btn" disabled={i===resumeData.experience.length-1}><ArrowDown size={14} /></button>
                    <button onClick={() => deleteEntry('experience', i)} className="icon-btn delete"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="row-inputs">
                  <input placeholder="Role" value={exp.role} onChange={(e) => updateEntry('experience', i, 'role', e.target.value)} />
                  <input placeholder="Company" value={exp.company} onChange={(e) => updateEntry('experience', i, 'company', e.target.value)} />
                </div>
                <input placeholder="Date Range" value={exp.date} onChange={(e) => updateEntry('experience', i, 'date', e.target.value)} className="form-input" />
                <textarea placeholder="Description of responsibilities and achievements..." value={exp.desc} onChange={(e) => updateEntry('experience', i, 'desc', e.target.value)} rows={3} className="form-textarea" />
                <button className="optimize-btn" disabled={isOptimizing.section === 'experience' && isOptimizing.index === i} onClick={() => handleOptimize('experience', i, exp.desc)}>
                  <Sparkles size={14} style={{ marginRight: 6 }} />
                  {isOptimizing.section === 'experience' && isOptimizing.index === i ? 'Optimizing...' : 'AI Optimize'}
                </button>
              </div>
            ))}
            <button className="add-btn" onClick={() => addEntry('experience', { company:'', role:'', date:'', desc:'' })}><Plus size={14} style={{ marginRight: 6 }} /> Add Experience</button>
          </div>

          {/* Projects */}
          <div className="editor-card">
            <h3 className="card-title">Technical Projects</h3>
            {resumeData.projects.map((proj, i) => (
              <div key={i} className="entry-card">
                <div className="entry-header">
                  <span className="entry-number">#{i+1}</span>
                  <div className="entry-actions">
                    <button onClick={() => moveEntry('projects', i, 'up')} className="icon-btn" disabled={i===0}><ArrowUp size={14} /></button>
                    <button onClick={() => moveEntry('projects', i, 'down')} className="icon-btn" disabled={i===resumeData.projects.length-1}><ArrowDown size={14} /></button>
                    <button onClick={() => deleteEntry('projects', i)} className="icon-btn delete"><Trash2 size={14} /></button>
                  </div>
                </div>
                <input placeholder="Project Name" value={proj.name} onChange={(e) => updateEntry('projects', i, 'name', e.target.value)} className="form-input" />
                <textarea placeholder="Project description, technologies used, and outcomes..." value={proj.desc} onChange={(e) => updateEntry('projects', i, 'desc', e.target.value)} rows={3} className="form-textarea" />
                <button className="optimize-btn" disabled={isOptimizing.section === 'projects' && isOptimizing.index === i} onClick={() => handleOptimize('projects', i, proj.desc)}>
                  <Sparkles size={14} style={{ marginRight: 6 }} />
                  {isOptimizing.section === 'projects' && isOptimizing.index === i ? 'Optimizing...' : 'AI Optimize'}
                </button>
              </div>
            ))}
            <button className="add-btn" onClick={() => addEntry('projects', { name:'', desc:'' })}><Plus size={14} style={{ marginRight: 6 }} /> Add Project</button>
          </div>
        </div>

        {/* RIGHT PANEL - PREVIEW (with ref) */}
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
    </div>
  );
};

export default App;