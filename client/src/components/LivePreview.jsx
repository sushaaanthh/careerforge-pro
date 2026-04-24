import React from 'react';

const LivePreview = ({ resumeData }) => {

  const handleDownloadPDF = async () => {
    const element = document.getElementById('resume-preview-content');
    if (!element) {
      console.error('[PDF] #resume-preview-content not found');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts.css" />
          <style>
            @page { size: A4; margin: 12mm; }
            html, body { margin: 0; padding: 0; background: #fff; }
            body {
              font-family: 'Computer Modern Serif', serif;
              color: #000;
              line-height: 1.3;
              font-size: 12px;
            }
            #resume-preview-content, .resume-paper {
              background: #fff !important;
              color: #000 !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
            .section-title, .section h3 {
              text-transform: uppercase;
              font-weight: 700;
              border-bottom: 1px solid #000;
              margin: 12px 0 6px 0;
              padding-bottom: 2px;
              letter-spacing: 0.2px;
            }
            .resume-header, .resume-name, .resume-contact {
              text-align: center !important;
              width: 100%;
            }
            .resume-name {
              margin: 0 0 6px 0;
            }
            .resume-contact {
              margin: 0 0 18px 0;
            }
            .entry-header, .entry-sub, .flex.justify-between.items-baseline {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              width: 100%;
            }
            .list-disc { list-style-type: disc; }
            .ml-5 { margin-left: 20px; }
            .mt-1 { margin-top: 4px; }
            .left-strong, .entry-header strong, .entry-sub strong { font-weight: 700; }
            .right-meta { text-align: right; white-space: nowrap; }
            .experience-block, .education-block, .project-block, .entry, .section {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>${element.outerHTML}</body>
      </html>
    `;

    try {
      const response = await fetch('http://localhost:5000/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[PDF] API failed', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        alert(errorData?.details || errorData?.error || `PDF API failed: ${response.status} ${response.statusText}`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'CareerForge_Resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[PDF] Download/network error', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      alert('PDF download failed. Check browser console and server logs.');
    }
  };

  const safeResume = resumeData || {};
  const education = safeResume.education || [];
  const skills = safeResume.skills || [];
  const experience = safeResume.experience || [];
  const projects = safeResume.projects || [];

  return (
    <>
      <button
        onClick={handleDownloadPDF}
        className="no-print fixed left-[calc(50%-450px)] top-40 z-50 floating-download-btn"
        aria-label="Download as PDF"
      >
        <span aria-hidden="true">PDF</span>
        <span>Download as PDF</span>
      </button>
      <div id="resume-preview-content" className="resume-paper">
        <h1 className="resume-name">{safeResume.name || 'YOUR NAME'}</h1>
        <p className="resume-contact">{safeResume.email || 'your.email@example.com'}</p>

        <div className="section education-block">
          <div className="section-title">EDUCATION</div>
          {education.map((ed, i) => (
            <div key={i} className="entry">
              <div className="flex justify-between items-baseline">
                <strong>{ed.school || 'Institution Name'}</strong>
                <span className="right-meta">{[ed.city, ed.country].filter(Boolean).join(', ')}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span>{`${ed.degree || 'Degree'}${ed.grades ? `; CGPA: ${ed.grades}` : ''}`}</span>
                <span className="right-meta">{ed.date || ''}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="section">
          <div className="section-title">TECHNICAL SKILLS</div>
          {skills.map((sk, i) => (
            <div key={i} className="entry">
              <strong>{sk.category || 'Category'}:</strong> {sk.items || ''}
            </div>
          ))}
        </div>

        <div className="section experience-block">
          <div className="section-title">EXPERIENCE</div>
          {experience.map((ex, i) => (
            <div key={i} className="entry">
              <div className="flex justify-between items-baseline">
                <strong>{`${ex.role || 'Role'} - ${ex.company || 'Company'}`}</strong>
                <span className="right-meta">{ex.date || ''}</span>
              </div>
              {!!ex.desc && (
                <ul className="list-disc ml-5 mt-1">
                  <li>{ex.desc}</li>
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="section project-block">
          <div className="section-title">PROJECTS</div>
          {projects.map((pr, i) => (
            <div key={i} className="entry">
              <div className="flex justify-between items-baseline">
                <strong>{pr.name || 'Project Name'}</strong>
                <span className="right-meta">{pr.date || ''}</span>
              </div>
              {!!pr.desc && (
                <ul className="list-disc ml-5 mt-1">
                  <li>{pr.desc}</li>
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default LivePreview;