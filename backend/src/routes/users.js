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
    let orgId;
    try {
      const org = mongoose.models.Organization ? await mongoose.model('Organization').findOne({}) : null;
      orgId = org ? org._id : new mongoose.Types.ObjectId();
    } catch(e) {
      orgId = new mongoose.Types.ObjectId();
    }

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

// ── DELETE /api/users/:id ─────────────────────────────────────────────────
// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Optional: Prevent deleting the super admin or yourself
    // if (user.email === process.env.SUPER_ADMIN_EMAIL) return res.status(403).json({ error: 'Cannot delete super admin' });

    await User.findByIdAndDelete(id);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
