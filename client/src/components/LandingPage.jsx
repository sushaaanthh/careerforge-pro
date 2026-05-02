import React from 'react';
import { Target, FileText, Cpu, ArrowRight, Briefcase, Users, TrendingUp, Award, Zap, CheckCircle, Rocket, BarChart3, Lightbulb, Smile } from 'lucide-react';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const features = [
    { Icon: Target, title: 'ATS Optimization', desc: 'Analyze job descriptions and optimize keywords to pass applicant tracking systems with precision.' },
    { Icon: FileText, title: 'LaTeX Precision', desc: 'Export pixel-perfect, professional PDF resumes that look exceptional on every screen.' },
    { Icon: Cpu, title: 'AI Assistant', desc: 'Generate compelling STAR-method bullet points instantly with advanced AI technology.' },
  ];

  const workflows = [
    { step: 1, title: 'Paste Job Description', desc: 'Simply paste any job description, and let our AI analyze the requirements.' },
    { step: 2, title: 'AI Rewrites Resume', desc: 'Our intelligent system tailors your resume to match the role perfectly.' },
    { step: 3, title: 'Export as PDF', desc: 'Download a beautifully formatted, ATS-friendly PDF resume instantly.' },
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="gradient-mesh"></div>
          <div className="floating-icons">
            <div className="floating-icon icon-1"><Briefcase size={40} /></div>
            <div className="floating-icon icon-2"><Users size={40} /></div>
            <div className="floating-icon icon-3"><TrendingUp size={40} /></div>
            <div className="floating-icon icon-4"><Award size={40} /></div>
            <div className="floating-icon icon-5"><Zap size={40} /></div>
            <div className="floating-icon icon-6"><CheckCircle size={40} /></div>
            <div className="floating-icon icon-7"><Rocket size={40} /></div>
            <div className="floating-icon icon-8"><BarChart3 size={40} /></div>
            <div className="floating-icon icon-9"><Lightbulb size={40} /></div>
            <div className="floating-icon icon-10"><Smile size={40} /></div>
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">CAREER FORGE PRO</h1>
          <p className="hero-subheadline">AI Resume Architect</p>
          <button
            className="cta-button primary"
            onClick={() => { window.location.assign('/app'); }}
          >
            Get Started
            <ArrowRight size={20} strokeWidth={2} className="button-icon" />
          </button>
        </div>
      </section>

      <section className="value-proposition">
        <div className="section-header">
          <h2>Why Choose Career Forge Pro?</h2>
          <p>Elevate your resume with cutting-edge AI technology</p>
        </div>

        <div className="features-grid">
          {features.map((feature, idx) => {
            const Icon = feature.Icon;
            return (
              <div key={idx} className="feature-card">
                <div className="icon-wrapper">
                  <Icon size={48} strokeWidth={1.5} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Three simple steps to transform your resume</p>
        </div>

        <div className="workflow-container">
          <div className="workflow-grid">
            {workflows.map((item, idx) => (
              <div key={idx} className="workflow-step">
                <div className="step-number">{item.step}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="secondary-cta">
        <div className="cta-content">
          <h2>Ready to Launch Your Career?</h2>
          <p>Join thousands of professionals who have already transformed their resumes with Career Forge Pro</p>
          <button
            className="cta-button secondary"
            onClick={() => { window.location.assign('/app'); }}
          >
            Start Your Journey Today
            <ArrowRight size={20} strokeWidth={2} className="button-icon" />
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <p>&copy; 2026 Career Forge Pro. All rights reserved.</p>
          <p>Developed by Batch No. 15</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
