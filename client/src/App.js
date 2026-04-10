import React, { useState } from 'react';
import './App.css';

const App = () => {
    const [resumeData, setResumeData] = useState({
        name: '', email: '', skills: '', education: [{ school: '', degree: '', location: '', date: '' }]
    });

    const updateField = (field, value) => {
        setResumeData({ ...resumeData, [field]: value });
    };

    return (
        <div className="container">
            {/* Editor Panel */}
            <div className="editor no-print">
                <h2 style={{fontFamily: 'sans-serif'}}>Resume Architect</h2>
                <input placeholder="Full Name" onChange={(e) => updateField('name', e.target.value)} />
                <input placeholder="Email" onChange={(e) => updateField('email', e.target.value)} />
                <textarea placeholder="Technical Skills" rows="5" onChange={(e) => updateField('skills', e.target.value)} />
                <button className="magic-btn" style={{padding: '12px', cursor: 'pointer', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px'}}>
                    AI Optimize (Week 2)
                </button>
            </div>

            {/* LaTeX Preview Panel */}
            <div className="preview latex-font">
                <div className="resume-paper">
                    <div className="resume-header">
                        <h1>{resumeData.name || "YOUR NAME"}</h1>
                        <p>{resumeData.email}</p>
                    </div>

                    <div className="section">
                        <div className="section-title">EDUCATION</div>
                        <div className="entry">
                            <div className="entry-header">
                                <strong>University Name</strong>
                                <span>City, Country</span>
                            </div>
                            <div className="entry-sub">
                                <em>Degree / Specialization</em>
                                <span>Date Range</span>
                            </div>
                        </div>
                    </div>

                    <div className="section">
                        <div className="section-title">TECHNICAL SKILLS</div>
                        <p style={{marginTop: '5px'}}>{resumeData.skills || "Add your skills in the editor..."}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;