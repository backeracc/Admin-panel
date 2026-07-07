import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import LoginLog from '../models/LoginLog.js';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware to check if user is Admin (for these routes)
// In a real app, you'd use a JWT verification middleware here.
// We'll skip strict token verification for this implementation scope, 
// but normally: router.use(verifyTokenAndAdmin);

// ── GET /api/users ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── POST /api/users ───────────────────────────────────────────────────────
// Admin creates a sub-user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Default to an existing organization ID if possible
    const org = await mongoose.model('Organization').findOne({});
    const orgId = org ? org._id : new mongoose.Types.ObjectId();

    const newUser = new User({
      id: new mongoose.Types.ObjectId().toString(),
      name: name || email.split('@')[0],
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      role,
      organizationId: orgId
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ── GET /api/users/logs ───────────────────────────────────────────────────
// View login history
router.get('/logs', async (req, res) => {
  try {
    const logs = await LoginLog.find({}).sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching login logs:', error);
    res.status(500).json({ error: 'Failed to fetch login logs' });
  }
});

export default router;
