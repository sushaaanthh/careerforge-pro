import React, { useState } from 'react';
import './App.css';

const App = () => {
    const [resumeData, setResumeData] = useState({
        name: 'Sushanth Sapare',
        title: 'Full Stack Developer',
        experience: '',
        education: 'AMC Engineering College'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setResumeData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="container">
            {/* Left Side: Editor */}
            <div className="editor">
                <h2>Resume Editor</h2>
                <input 
                    name="name" 
                    value={resumeData.name} 
                    onChange={handleChange} 
                    placeholder="Full Name"
                />
                <textarea 
                    name="experience" 
                    value={resumeData.experience} 
                    onChange={handleChange} 
                    placeholder="Describe your experience..."
                />
                <button onClick={() => console.log('Saving to MongoDB...')}>
                    Save Progress
                </button>
            </div>

            {/* Right Side: Zilla Slab Preview */}
            <div className="preview">
                <header>
                    <h1>{resumeData.name}</h1>
                    <p>{resumeData.title}</p>
                </header>
                <section>
                    <h3>Education</h3>
                    <p>{resumeData.education}</p>
                </section>
                <section>
                    <h3>Experience</h3>
                    <p>{resumeData.experience || "Your AI-optimized experience will appear here."}</p>
                </section>
            </div>
        </div>
    );
};

export default App;