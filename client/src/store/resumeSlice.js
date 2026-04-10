import { createSlice } from '@reduxjs/toolkit';

const resumeSlice = createSlice({
  name: 'resume',
  initialState: {
    personalInfo: { fullName: 'SUSHANTH SAPARE', email: '', linkedin: '', github: '' },
    education: [],
    workExperience: [],
    technicalSkills: {
      programmingLanguages: [],
      webDevelopment: [],
      databases: [],
      dataAnalytics: [],
      coreConcepts: [],
      designTools: [],
      tools: []
    },
    technicalProjects: [],
    softSkills: []
  },
  reducers: {
    updateField: (state, action) => {
      const { section, field, value } = action.payload;
      if (field) state[section][field] = value;
      else state[section] = value;
    }
  }
});

export const { updateField } = resumeSlice.actions;
export default resumeSlice.reducer;