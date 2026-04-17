import React, { useState, useEffect } from 'react';
import './App.css';

// Recursively extracts all string/number leaf values from a nested object.
// This prevents false ATS keyword matches against JSON keys like "desc", "name", "company".
const extractValues = (obj) => {
    if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
    if (Array.isArray(obj)) return obj.map(extractValues).join(' ');
    if (typeof obj === 'object' && obj !== null) return Object.values(obj).map(extractValues).join(' ');
    return '';
};

const App = () => {
    const [resumeData, setResumeData] = useState({
        name: '', email: '', 
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

    const addEntry = (section, template) => {
        setResumeData({ ...resumeData, [section]: [...resumeData[section], template] });
    };

    const updateEntry = (section, index, field, value) => {
        const updatedSection = [...resumeData[section]];
        updatedSection[index][field] = value;
        setResumeData({ ...resumeData, [section]: updatedSection });
    };

    // FIX: Use extractValues() instead of JSON.stringify() so ATS matching
    // only checks actual user-typed content, not JSON structural keys.
    useEffect(() => {
        if (targetKeywords.length === 0) {
            setAtsScore(0);
            return;
        }

        const fullResumeText = extractValues(resumeData).toLowerCase();
        let matches = 0;

        targetKeywords.forEach(keyword => {
            if (fullResumeText.includes(keyword.toLowerCase())) {
                matches++;
            }
        });

        const score = Math.round((matches / targetKeywords.length) * 100);
        setAtsScore(score);
    }, [resumeData, targetKeywords]);

    const handleAnalyzeJD = async () => {
        if (!jobDescription.trim()) return;
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
            } else {
                alert("Failed to analyze JD.");
            }
        } catch (error) {
            alert("Network Error.");
        } finally {
            setIsAnalyzingJD(false);
        }
    };

    const handleOptimize = async (section, index, text) => {
        if (!text || text.trim() === '') return;
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
            } else {
                alert("Optimization failed.");
            }
        } catch (error) {
            alert("Could not connect to server.");
        } finally {
            setIsOptimizing({ section: null, index: null });
        }
    };

    return (
        <div className="container">
            {/* LEFT SIDE: EDITOR */}
            <div className="editor no-print">
                <h2>Resume Architect</h2>
                
                <div className="edit-section" style={{ background: '#f0f4f8', padding: '15px', borderRadius: '5px' }}>
                    <h4>Job Description Analysis</h4>
                    <textarea 
                        placeholder="Paste target Job Description here to extract keywords..." 
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                    />
                    <button 
                        className="download-btn" 
                        style={{ marginTop: '10px' }}
                        onClick={handleAnalyzeJD}
                        disabled={isAnalyzingJD}
                    >
                        {isAnalyzingJD ? "ANALYZING JD..." : "EXTRACT KEYWORDS"}
                    </button>
                    
                    {targetKeywords.length > 0 && (
                        <div style={{ marginTop: '15px' }}>
                            <strong>ATS Match: {atsScore}%</strong>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                                {targetKeywords.map((kw, i) => {
                                    // FIX: same extractValues() fix applied to inline chip rendering
                                    const isFound = extractValues(resumeData).toLowerCase().includes(kw.toLowerCase());
                                    return (
                                        <span key={i} style={{ 
                                            background: isFound ? '#d4edda' : '#f8d7da', 
                                            color: isFound ? '#155724' : '#721c24',
                                            padding: '3px 8px', borderRadius: '12px', fontSize: '11px' 
                                        }}>
                                            {kw}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="edit-section">
                    <input placeholder="Full Name" onChange={(e) => setResumeData({...resumeData, name: e.target.value})} />
                    <input placeholder="Email" onChange={(e) => setResumeData({...resumeData, email: e.target.value})} />
                </div>

                <div className="edit-section">
                    <h4>Education</h4>
                    {resumeData.education.map((edu, i) => (
                        <div key={i} className="input-group">
                            <input placeholder="University Name" onChange={(e) => updateEntry('education', i, 'school', e.target.value)} />
                            <div className="row">
                                <input placeholder="City" onChange={(e) => updateEntry('education', i, 'city', e.target.value)} />
                                <input placeholder="Country" onChange={(e) => updateEntry('education', i, 'country', e.target.value)} />
                            </div>
                            <input placeholder="Degree / Specialization" onChange={(e) => updateEntry('education', i, 'degree', e.target.value)} />
                            <input placeholder="Grades" onChange={(e) => updateEntry('education', i, 'grades', e.target.value)} />
                            <input placeholder="Date Range" onChange={(e) => updateEntry('education', i, 'date', e.target.value)} />
                        </div>
                    ))}
                    <button className="add-btn" onClick={() => addEntry('education', { school:'', city:'', country:'', degree:'', grades:'', date:'' })}>+ Add Education</button>
                </div>

                <div className="edit-section">
                    <h4>Technical Skills</h4>
                    {resumeData.skills.map((skill, i) => (
                        <div key={i} className="row" style={{ marginBottom: '8px' }}>
                            <input 
                                placeholder="Category (e.g., Languages)" 
                                style={{ width: '35%' }} 
                                value={skill.category} 
                                onChange={(e) => updateEntry('skills', i, 'category', e.target.value)} 
                            />
                            <input 
                                placeholder="Skills (comma separated)" 
                                style={{ width: '65%' }} 
                                value={skill.items} 
                                onChange={(e) => updateEntry('skills', i, 'items', e.target.value)} 
                            />
                        </div>
                    ))}
                    <button className="add-btn" onClick={() => addEntry('skills', { category: '', items: '' })}>+ Add Skill Category</button>
                </div>

                <div className="edit-section">
                    <h4>Experience</h4>
                    {resumeData.experience.map((exp, i) => (
                        <div key={i} className="input-group">
                            <div className="row">
                                <input placeholder="Role" onChange={(e) => updateEntry('experience', i, 'role', e.target.value)} />
                                <input placeholder="Company" onChange={(e) => updateEntry('experience', i, 'company', e.target.value)} />
                            </div>
                            <input placeholder="Date Range" onChange={(e) => updateEntry('experience', i, 'date', e.target.value)} />
                            <textarea 
                                placeholder="Description" 
                                value={exp.desc} 
                                onChange={(e) => updateEntry('experience', i, 'desc', e.target.value)} 
                            />
                            <button 
                                className="optimize-btn"
                                disabled={isOptimizing.section === 'experience' && isOptimizing.index === i}
                                onClick={() => handleOptimize('experience', i, exp.desc)}
                            >
                                {isOptimizing.section === 'experience' && isOptimizing.index === i ? 'OPTIMIZING...' : 'AI OPTIMIZE'}
                            </button>
                        </div>
                    ))}
                    <button className="add-btn" onClick={() => addEntry('experience', { company:'', role:'', date:'', desc:'' })}>+ Add Experience</button>
                </div>

                <div className="edit-section">
                    <h4>Projects</h4>
                    {resumeData.projects.map((proj, i) => (
                        <div key={i} className="input-group">
                            <input placeholder="Project Name" onChange={(e) => updateEntry('projects', i, 'name', e.target.value)} />
                            <textarea 
                                placeholder="Description" 
                                value={proj.desc} 
                                onChange={(e) => updateEntry('projects', i, 'desc', e.target.value)} 
                            />
                            <button 
                                className="optimize-btn"
                                disabled={isOptimizing.section === 'projects' && isOptimizing.index === i}
                                onClick={() => handleOptimize('projects', i, proj.desc)}
                            >
                                {isOptimizing.section === 'projects' && isOptimizing.index === i ? 'OPTIMIZING...' : 'AI OPTIMIZE'}
                            </button>
                        </div>
                    ))}
                    <button className="add-btn" onClick={() => addEntry('projects', { name:'', desc:'' })}>+ Add Project</button>
                </div>

                <div className="edit-section" style={{ border: 'none', marginTop: '20px' }}>
                    <button className="download-btn" onClick={() => window.print()}>
                        DOWNLOAD AS PDF
                    </button>
                </div>
            </div>

            {/* RIGHT SIDE: PREVIEW */}
            <div className="preview latex-font">
                <div className="resume-paper">
                    <header className="resume-header">
                        <h1>{resumeData.name || "YOUR NAME"}</h1>
                        <p>{resumeData.email}</p>
                    </header>

                    <section className="section">
                        <div className="section-title">EDUCATION</div>
                        {resumeData.education.map((edu, i) => (
                            <div key={i} className="entry">
                                <div className="entry-header">
                                    <strong>{edu.school || "UNIVERSITY NAME"}</strong>
                                    <strong>{edu.city}{edu.city && edu.country ? ', ' : ''}{edu.country}</strong>
                                </div>
                                <div className="entry-sub">
                                    <em>{edu.degree}{edu.grades ? `; CGPA: ${edu.grades}` : ''}</em>
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
                                        <strong>{skill.category}:</strong> <span>{skill.items}</span>
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
                                <p className="entry-desc">{exp.desc}</p>
                            </div>
                        ))}
                    </section>

                    <section className="section">
                        <div className="section-title">TECHNICAL PROJECTS</div>
                        {resumeData.projects.map((proj, i) => (
                            <div key={i} className="entry">
                                <strong>● {proj.name}</strong>
                                <p className="entry-desc">{proj.desc}</p>
                            </div>
                        ))}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default App;