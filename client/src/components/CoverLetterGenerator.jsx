import React, { useState } from 'react';

const CoverLetterGenerator = ({ resumeData, fullName, resumeText }) => {
  const friendlyBusyMessage = 'The AI is currently busy. Please wait a moment and try again.';
  const [jdText, setJdText] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!jdText.trim()) return;
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const res = await fetch('http://localhost:5000/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jdText,
          resumeData: resumeData || {
            name: fullName,
            resumeText
          }
        })
      });
      const json = await res.json();
      if (res.ok) {
        setCoverLetter(json.coverLetter || '');
        return;
      }

      const serverMessage = String(json?.error || '');
      setError(
        res.status >= 500 || /high demand|busy|try again/i.test(serverMessage)
          ? friendlyBusyMessage
          : serverMessage || 'Failed to generate cover letter.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!coverLetter) return;

    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (clipboardError) {
      setError('Could not copy the cover letter right now. Please try again.');
    }
  };

  return (
    <div className="cf-glass-card">
      <h2 className="cf-title">Cover Letter Generator</h2>
      <p className="template-status">Paste the target job description and generate a tailored letter from your saved resume data.</p>
      <textarea
        className="cf-textarea"
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste the job description here..."
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button className="cf-btn" onClick={handleGenerate} disabled={loading || !jdText.trim()}>
          {loading ? 'Generating...' : 'Generate Cover Letter'}
        </button>

        <button className="cf-btn" onClick={handleCopy} disabled={!coverLetter}>
          {copied ? 'Copied' : 'Copy to Clipboard'}
        </button>
      </div>

      {error && <p className="template-status" style={{ color: '#fda4af', marginTop: 12 }}>{error}</p>}

      {coverLetter && (
        <div
          className="cover-letter-output"
          style={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.8,
            marginTop: 16,
            padding: '16px 18px',
            fontSize: '14px',
            color: '#1a1a1a',
            backgroundColor: '#f8f9fa',
            border: '1px solid rgba(100, 120, 180, 0.3)',
            borderRadius: '10px',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            boxShadow: '0 2px 8px rgba(100, 120, 180, 0.1)'
          }}
        >{coverLetter}</div>
      )}
      
      {coverLetter && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button 
            className="cf-btn" 
            onClick={() => {
              const htmlContent = `
                <html>
                  <head>
                    <style>
                      body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.8; color: #1a1a1a; }
                      pre { white-space: pre-wrap; }
                    </style>
                  </head>
                  <body>
                    ${coverLetter.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                  </body>
                </html>
              `;
              fetch('http://localhost:5000/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ htmlContent })
              })
              .then(res => res.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cover-letter-${new Date().toISOString().split('T')[0]}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
              })
              .catch(err => setError('Failed to download PDF'));
            }}
            style={{ marginTop: 12 }}
          >
            📄 Download Cover Letter as PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default CoverLetterGenerator;