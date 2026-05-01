const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  ownerEmail: { type: String, index: true },
  title: { type: String, default: 'Untitled Resume' },
  resumeData: { type: mongoose.Schema.Types.Mixed, default: {} },
  parsedData: { type: mongoose.Schema.Types.Mixed, default: {} },
  personalInfo: {
    fullName: String,
    email: String,
    linkedin: String,
    github: String,
  },
  education: [{ type: mongoose.Schema.Types.Mixed, default: {} }],
  experience: [{ type: mongoose.Schema.Types.Mixed, default: {} }],
  skills: [{ type: mongoose.Schema.Types.Mixed, default: {} }],
  projects: [{ type: mongoose.Schema.Types.Mixed, default: {} }],
  workExperience: [{
    role: String,
    company: String,
    location: String,
    duration: String,
    description: [String]
  }],
  technicalSkills: {
    programmingLanguages: [String],
    webDevelopment: [String],
    databases: [String],
    dataAnalytics: [String],
    coreConcepts: [String],
    designTools: [String],
    tools: [String]
  },
  technicalProjects: [{
    title: String,
    description: String
  }],
  softSkills: [String],
  atsScore: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);