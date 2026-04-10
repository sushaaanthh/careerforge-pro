// ... inside your Preview map functions ...

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
                <span>{edu.date || "DATE RANGE"}</span>
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
                <span>{exp.date}</span>
            </div>
            <p className="entry-desc">{exp.desc}</p>
        </div>
    ))}
</section>