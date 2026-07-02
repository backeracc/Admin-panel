import express from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // store file in memory to upload to cloudinary

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'resumes' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

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
router.post('/apply', upload.single('resume'), async (req, res) => {
  try {
    const {
      jobId,
      name,
      email,
      phone,
      linkedin,
      portfolio,
      github,
      customAnswers
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

    let uploadedResumeUrl = '';
    
    // Upload to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        uploadedResumeUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload resume file' });
      }
    } else if (req.body.resumeUrl) {
      // Fallback if frontend sends a URL directly
      uploadedResumeUrl = req.body.resumeUrl;
    }

    const newApp = new Application({
      id: new mongoose.Types.ObjectId().toString(),
      jobId,
      userId: `public_${Date.now()}`,
      phone,
      linkedin: linkedin || '',
      portfolio: portfolio || '',
      github: github || '',
      resume: uploadedResumeUrl, // stores the cloudinary URL
      resumeFileUrl: uploadedResumeUrl, // explicit field in schema
      resumeFileName: req.file ? req.file.originalname : '',
      resumeMimeType: req.file ? req.file.mimetype : '',
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
