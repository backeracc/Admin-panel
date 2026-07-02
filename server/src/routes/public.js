import express from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import multer from 'multer';

const router = express.Router();
const upload = multer(); // basic multer setup in case they use multipart/form-data

// GET /api/public/jobs - Get all open jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({ isOpen: true }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/public/jobs/:id - Get specific job details
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ id: req.params.id, isOpen: true }) || await Job.findById(req.params.id).catch(() => null);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// POST /api/public/apply - Submit a job application
router.post('/apply', upload.any(), async (req, res) => {
  try {
    const {
      jobId,
      name,
      email,
      phone,
      linkedin,
      portfolio,
      github,
      customAnswers, // Expected as a JSON string if multipart, or array if JSON
      resumeUrl // in case the frontend uploads to s3 and passes url
    } = req.body;

    if (!jobId || !name || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let parsedAnswers = [];
    if (customAnswers) {
      try {
        parsedAnswers = typeof customAnswers === 'string' ? JSON.parse(customAnswers) : customAnswers;
      } catch (e) {
        console.error('Failed to parse customAnswers:', e);
      }
    }

    const newApp = new Application({
      id: new mongoose.Types.ObjectId().toString(),
      jobId,
      userId: `public_${Date.now()}`, // Generic user ID for public applicants without accounts
      phone,
      linkedin: linkedin || '',
      portfolio: portfolio || '',
      github: github || '',
      resume: resumeUrl || '',
      customAnswers: parsedAnswers,
      status: 'PENDING'
    });

    await newApp.save();
    res.status(201).json({ message: 'Application submitted successfully', application: newApp });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

export default router;
