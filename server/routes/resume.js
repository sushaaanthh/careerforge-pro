const express = require('express');
const { verifyToken, requirePro } = require('../src/middleware/auth');
const SavedResume = require('../src/models/Resume');

const router = express.Router();

// All dashboard routes require Pro plan
router.use(requirePro);

// Save a resume
router.post('/save', async (req, res) => {
  try {
    const userId = verifyToken(req);
    const { name, resumeData, keywords, jobDescription } = req.body;
    
    const saved = new SavedResume({
      userId,
      name,
      data: resumeData,
      keywords: keywords || [],
      jobDescription: jobDescription || ''
    });
    await saved.save();
    res.json({ id: saved._id });
  } catch (err) {
    console.error('Save error:', err);
    res.status(401).json({ error: err.message });
  }
});

// Get all resumes for user
router.get('/list', async (req, res) => {
  try {
    const userId = verifyToken(req);
    const resumes = await SavedResume.find({ userId }).sort({ updatedAt: -1 });
    res.json(resumes);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Get a single resume
router.get('/:id', async (req, res) => {
  try {
    const userId = verifyToken(req);
    const resume = await SavedResume.findOne({ _id: req.params.id, userId });
    if (!resume) return res.status(404).json({ error: 'Not found' });
    res.json(resume);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a resume
router.delete('/:id', async (req, res) => {
  try {
    const userId = verifyToken(req);
    await SavedResume.findOneAndDelete({ _id: req.params.id, userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ CORRECT EXPORT – router directly, not inside an object
module.exports = router;