import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import TrustedDevice from '../models/TrustedDevice.js';
import LoginLog from '../models/LoginLog.js';
import { sendOtpEmail } from '../lib/otpMailer.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

const router = express.Router();

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
  
  // Note: For a robust system, you might also want refresh tokens, but for now we issue the access token.
  return { accessToken };
};

const logLogin = async (email, role, ipAddress, userAgent, status, userId = null) => {
  try {
    await LoginLog.create({
      userId,
      email,
      role: role || 'unknown',
      ipAddress,
      userAgent,
      status
    });
  } catch (error) {
    console.error('Failed to log login:', error);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // 1. Find User (or auto-create if it's the super admin from .env)
    let user = await User.findOne({ email }).select('+passwordHash +password');
    
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    // Parse additional admins from env: "email1:pass1,email2:pass2"
    // Defaulting to the requested test credentials if not provided in env
    const additionalAdminsStr = process.env.ADDITIONAL_ADMINS || 'prizmatveev@gmail.com:prizmat';
    const additionalAdmins = additionalAdminsStr.split(',').map(pair => {
      const [aEmail, aPass] = pair.split(':');
      return { email: aEmail?.trim(), password: aPass?.trim() };
    }).filter(a => a.email && a.password);

    let isAutoAdminLogin = false;

    if (superAdminEmail && email === superAdminEmail && password === superAdminPassword) {
      isAutoAdminLogin = true;
    } else {
      const match = additionalAdmins.find(a => a.email === email && a.password === password);
      if (match) {
        isAutoAdminLogin = true;
      }
    }

    if (isAutoAdminLogin) {
      if (!user) {
        // Auto-seed the admin if they don't exist
        const org = await mongoose.model('Organization').findOne({});
        const orgId = org ? org._id : new mongoose.Types.ObjectId();

        user = new User({
          id: new mongoose.Types.ObjectId().toString(),
          name: 'Admin (' + email.split('@')[0] + ')',
          email: email,
          passwordHash: password, // Will be hashed by the pre-save hook
          role: 'admin',
          organizationId: orgId
        });
        await user.save();
      } else if (!user.passwordHash && !user.password) {
        // User exists but has no password (e.g. from Google OAuth), so give them one
        user.passwordHash = password;
        user.role = 'admin';
        await user.save();
      }
    } else {
      if (!user) {
        await logLogin(email, null, ipAddress, userAgent, 'Failed');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // 2. Verify Password
      const hashToCompare = user.passwordHash || user.password;
      if (!hashToCompare) {
        await logLogin(email, user.role, ipAddress, userAgent, 'Failed', user._id);
        return res.status(401).json({ error: 'Invalid user account setup' });
      }

      const isMatch = await bcrypt.compare(password, hashToCompare);
      if (!isMatch) {
        await logLogin(email, user.role, ipAddress, userAgent, 'Failed', user._id);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // 3. Admin MFA Check
    if (user.role === 'admin') {
      // Check for Trusted Device Cookie
      const deviceToken = req.cookies.lsm_device_token;
      let isTrusted = false;

      if (deviceToken) {
        const trustedDevice = await TrustedDevice.findOne({
          userId: user._id,
          deviceToken,
          expiresAt: { $gt: new Date() }
        });
        
        if (trustedDevice) {
          isTrusted = true;
          // Optionally extend expiration
          trustedDevice.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days
          await trustedDevice.save();
        }
      }

      if (!isTrusted) {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save to user model
        user.otpCode = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await user.save();

        // Send Email
        await sendOtpEmail(user.email, otp);

        return res.json({ requireOtp: true, message: 'OTP sent to your email.' });
      }
    }

    // 4. Sub-user OR Trusted Admin: Login Success
    const { accessToken } = generateTokens(user);
    
    await logLogin(email, user.role, ipAddress, userAgent, 'Success', user._id);

    // Optional: set access token as httpOnly cookie, or return it in body
    // We will return it in body for frontend to use as standard
    res.json({
      success: true,
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, rememberMe } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const user = await User.findOne({ email });
    if (!user || user.role !== 'admin') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    if (!user.otpCode || user.otpCode !== otp || user.otpExpires < new Date()) {
      await logLogin(email, user.role, ipAddress, userAgent, 'Failed', user._id);
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Handle "Remember Me"
    if (rememberMe) {
      const deviceToken = crypto.randomBytes(32).toString('hex');
      
      await TrustedDevice.create({
        userId: user._id,
        deviceToken,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      // Set HttpOnly Cookie
      res.cookie('lsm_device_token', deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    // Login Success
    const { accessToken } = generateTokens(user);
    await logLogin(email, user.role, ipAddress, userAgent, 'Success', user._id);

    res.json({
      success: true,
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('OTP Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  // Clear the device token cookie if we want them to re-verify next time
  // Or keep it so they stay trusted. Usually logout just clears the session/token.
  // We won't clear the device trust on regular logout unless they explicitly "revoke devices".
  // res.clearCookie('lsm_device_token'); 
  res.json({ success: true });
});

export default router;
