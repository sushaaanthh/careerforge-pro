import React, { useState } from 'react';
import './App.css';

const App = () => {
    const [resumeData, setResumeData] = useState({
        name: '', email: '', linkedin: '', github: '',
        education: [{ school: '', degree: '', info: '', location: '', date: '' }],
        experience: [{ title: '', company: '', date: '', desc: '' }],
        skills: ''
    });

    const handleUpdate = (path, value) => {
        setResumeData(prev => ({ ...prev, [path]: value }));
    };

    return (
        <div className="container">
            <div className="editor no-print">
                <h2>Resume Architect</h2>
                <input placeholder="Full Name" onChange={(e) => handleUpdate('name', e.target.value)} />
                <input placeholder="Email" onChange={(e) => handleUpdate('email', e.target.value)} />
                <textarea placeholder="Technical Skills" onChange={(e) => handleUpdate('skills', e.target.value)} />
                <button className="magic-btn">AI Optimize (Week 2)</button>
            </div>

            <div className="preview latex-font">
                <div className="resume-header">
                    <h1>{resumeData.name || "YOUR NAME"}</h1>
                    <div className="contact-info">
                        {resumeData.email && <span>{resumeData.email}</span>}
                        {resumeData.linkedin && <span> | {resumeData.linkedin}</span>}
                        {resumeData.github && <span> | {resumeData.github}</span>}
                    </div>
                </div>

                <div className="section">
                    <h2 className="section-title">EDUCATION</h2>
                    {resumeData.education.map((edu, i) => (
                        <div key={i} className="entry">
                            <div className="entry-header">
                                <strong>{edu.school || "University Name"}</strong>
                                <span>{edu.location || "City, Country"}</span>
                            </div>
                            <div className="entry-sub">
                                <em>{edu.degree || "Degree"}</em>
                                <span>{edu.date || "Date Range"}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="section">
                    <h2 className="section-title">TECHNICAL SKILLS</h2>
                    <p>{resumeData.skills || "Add your skills in the editor..."}</p>
                </div>
            </div>
        </div>
    );
};

export default App;