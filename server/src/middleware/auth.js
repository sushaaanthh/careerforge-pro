const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = (req) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) throw new Error('No token');
  const token = auth.split(' ')[1];
  return jwt.verify(token, process.env.JWT_SECRET).userId;
};

const requirePro = async (req, res, next) => {
  try {
    const userId = verifyToken(req);
    const user = await User.findById(userId);
    if (!user || user.plan !== 'pro') {
      return res.status(403).json({ error: 'Upgrade to Pro to access this feature' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

module.exports = { verifyToken, requirePro };