import React, { useState } from 'react';
import './App.css';

const App = () => {
    const [resumeData, setResumeData] = useState({
        name: '', email: '', 
        education: [{ school: '', city: '', country: '', degree: '', grades: '', date: '' }],
        experience: [{ company: '', role: '', date: '', desc: '' }],
        projects: [{ name: '', desc: '' }]
    });

    // Track which specific field is currently being optimized
    const [isOptimizing, setIsOptimizing] = useState({ section: null, index: null });

    const addEntry = (section, template) => {
        setResumeData({ ...resumeData, [section]: [...resumeData[section], template] });
    };

    const updateEntry = (section, index, field, value) => {
        const updatedSection = [...resumeData[section]];
        updatedSection[index][field] = value;
        setResumeData({ ...resumeData, [section]: updatedSection });
    };

    // --- THE AI HANDSHAKE LOGIC ---
    const handleOptimize = async (section, index, text) => {
        if (!text || text.trim() === '') return; // Prevent optimizing empty fields

        // Set loading state for this specific button
        setIsOptimizing({ section, index });

        try {
            const response = await fetch("http://127.0.0.1:5000/api/optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, sectionType: section })
            });

            const data = await response.json();

            if (response.ok && data.optimizedText) {
                // Instantly update the text area with the AI's response
                updateEntry(section, index, 'desc', data.optimizedText);
            } else {
                console.error("AI Error:", data.error);
                alert("Optimization failed. The AI Brain might be busy.");
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("Could not connect to the backend server.");
        } finally {
            // Remove loading state
            setIsOptimizing({ section: null, index: null });
        }
    };

    return (
        <div className="container">
            {/* LEFT SIDE: EDITOR */}
            <div className="editor no-print">
                <h2>Resume Architect</h2>
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
                    <h4>Experience</h4>
                    {resumeData.experience.map((exp, i) => (
                        <div key={i} className="input-group">
                            <input placeholder="Role" onChange={(e) => updateEntry('experience', i, 'role', e.target.value)} />
                            <input placeholder="Company" onChange={(e) => updateEntry('experience', i, 'company', e.target.value)} />
                            <input placeholder="Date Range" onChange={(e) => updateEntry('experience', i, 'date', e.target.value)} />
                            <textarea 
                                placeholder="Description" 
                                value={exp.desc} // Force React to control this value
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
                                value={proj.desc} // Force React to control this value
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
            </div>

            {/* RIGHT SIDE: LATEX PREVIEW */}
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