const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  personalInfo: {
    fullName: String,
    email: String,
    linkedin: String,
    github: String,
  },
  education: [{
    institution: String,
    location: String,
    degree: String,
    duration: String,
    percentage: String
  }],
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
});

module.exports = mongoose.model('Resume', ResumeSchema);