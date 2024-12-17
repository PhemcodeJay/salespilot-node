const express = require('express');
const { verifyToken } = require('./jwtUtils');

const router = express.Router();

// Protected route
router.get('/protected', verifyToken, (req, res) => {
    res.json({ message: 'Welcome!', user: req.user });
});

module.exports = router;
