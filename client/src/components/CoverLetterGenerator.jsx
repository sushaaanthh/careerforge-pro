import React, { useState } from 'react';

const CoverLetterGenerator = ({ fullName, resumeText }) => {
  const [jdText, setJdText] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!jdText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText, fullName, resumeText })
      });
      const json = await res.json();
      if (res.ok) setCoverLetter(json.coverLetter || '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="basic-card">
      <h2>Cover Letter Generator</h2>
      <textarea
        className="basic-textarea"
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste job description..."
      />
      <button className="basic-btn" onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Cover Letter'}
      </button>

      {coverLetter && (
        <pre className="basic-output">{coverLetter}</pre>
      )}
    </div>
  );
};

export default CoverLetterGenerator;