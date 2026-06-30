import express from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { sendShortlistedEmail } from '../lib/mailer.js';
import EmployeeProgress from '../models/EmployeeProgress.js';

const router = express.Router();

// GET /api/admin/jobs - Get all jobs ordered newest first
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({}).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /api/admin/jobs - Create a new job (useful for testing/seeding)
router.post('/jobs', async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      location,
      salary,
      experience,
      employmentType,
      skills,
      customQuestions,
      openings,
      isOpen
    } = req.body;

    const job = new Job({
      title,
      category,
      description,
      location,
      salary,
      experience,
      employmentType,
      skills: skills || [],
      customQuestions: customQuestions || [],
      openings: openings || 1,
      isOpen: isOpen !== undefined ? isOpen : true
    });

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET /api/admin/applications - Get all applications ordered newest first
router.get('/applications', async (req, res) => {
  try {
    // Populate user and job
    const applications = await Application.find({})
      .populate('userId', 'name email role')
      .populate('jobId', 'title category')
      .sort({ createdAt: -1 });

    // Format output to match client expectation (user and job objects directly populated)
    const formatted = applications.map(app => {
      const appObj = app.toJSON();
      return {
        ...appObj,
        // Fallbacks in case user or job is not populated
        user: appObj.userId || { name: 'Unknown User', email: 'unknown@localsm.com' },
        job: appObj.jobId || { title: 'Unknown Job', category: 'General' }
      };
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/admin/applications - Create a new application (useful for testing/seeding)
router.post('/applications', async (req, res) => {
  try {
    const {
      userId,
      jobId,
      resume,
      linkedin,
      github,
      portfolio,
      phone,
      location,
      yearsExperience,
      currentCompany,
      expectedSalary,
      coverLetter,
      status
    } = req.body;

    // Verify user and job exist
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const jobExists = await Job.findById(jobId);
    if (!jobExists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const application = new Application({
      userId,
      jobId,
      resume: resume || '',
      linkedin: linkedin || '',
      github: github || '',
      portfolio,
      phone,
      location,
      yearsExperience,
      currentCompany,
      expectedSalary,
      coverLetter,
      status: status || 'PENDING'
    });

    await application.save();
    res.status(201).json(application);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PATCH /api/admin/jobs/:id - Update an existing job
router.patch('/jobs/:id', async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      location,
      salary,
      experience,
      employmentType,
      skills,
      customQuestions,
      openings,
      isOpen
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (salary !== undefined) updateData.salary = salary;
    if (experience !== undefined) updateData.experience = experience;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (skills !== undefined) {
      updateData.skills = Array.isArray(skills) ? skills.map(s => String(s || '').trim()).filter(Boolean) : [];
    }
    if (customQuestions !== undefined) {
      updateData.customQuestions = Array.isArray(customQuestions) 
        ? Array.from(new Set(customQuestions.map(q => String(q || '').trim()).filter(Boolean)))
        : [];
    }
    if (openings !== undefined) {
      const openingsVal = Number(openings);
      updateData.openings = Number.isFinite(openingsVal) && openingsVal > 0 ? Math.floor(openingsVal) : 1;
    }
    if (isOpen !== undefined) updateData.isOpen = !!isOpen;

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE /api/admin/jobs/:id - Delete a job and its applications
router.delete('/jobs/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const jobId = req.params.id;

    // 1. Delete all applications related to this job
    await Application.deleteMany({ jobId }).session(session);

    // 2. Delete the job
    const job = await Job.findByIdAndDelete(jobId).session(session);

    if (!job) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Job not found' });
    }

    await session.commitTransaction();
    session.endSession();
    res.json({ ok: true });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// PATCH /api/admin/applications/:id - Update application status / add notes
router.patch('/applications/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { status, note } = req.body;
    const appId = req.params.id;

    // Retrieve application
    const app = await Application.findById(appId).session(session);
    if (!app) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Application not found' });
    }

    // Mode A: Only adding a note
    if (note !== undefined && status === undefined) {
      const trimmedNote = String(note || '').trim();
      if (!trimmedNote) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Note content cannot be empty' });
      }

      app.notes.push({ note: trimmedNote });
      await app.save({ session });
      await session.commitTransaction();
      session.endSession();

      const createdNote = app.notes[app.notes.length - 1];
      return res.json({ ok: true, note: createdNote });
    }

    // Mode B: Updating status (and optional note)
    const validStatuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'];
    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid application status' });
    }

    const previousStatus = app.status;
    const nextStatus = status;

    let mailWarning = null;
    let mailReport = null;

    if (previousStatus !== nextStatus) {
      const delta =
        previousStatus !== 'SHORTLISTED' && nextStatus === 'SHORTLISTED'
          ? -1
          : previousStatus === 'SHORTLISTED' && nextStatus !== 'SHORTLISTED'
            ? 1
            : 0;

      if (delta !== 0) {
        const job = await Job.findById(app.jobId).session(session);
        if (!job) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ error: 'Associated job not found' });
        }

        if (delta === -1 && job.openings <= 0) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ error: 'No openings left for this job. Increase openings before shortlisting.' });
        }

        // Adjust job openings
        job.openings += delta;
        await job.save({ session });
      }

      app.status = nextStatus;
    }

    if (note !== undefined) {
      const trimmedNote = String(note || '').trim();
      if (trimmedNote) {
        app.notes.push({ note: trimmedNote });
      }
    }

    await app.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Side effect: send email (outside database transaction)
    if (previousStatus !== 'SHORTLISTED' && nextStatus === 'SHORTLISTED') {
      try {
        const populatedApp = await Application.findById(appId)
          .populate('userId', 'name email')
          .populate('jobId', 'title');

        if (populatedApp && populatedApp.userId) {
          const mailResult = await sendShortlistedEmail({
            candidateName: populatedApp.userId.name || 'Candidate',
            candidateEmail: populatedApp.userId.email || '',
            jobRole: populatedApp.jobId?.title || 'the role'
          });

          if (!mailResult.success) {
            mailWarning = 'Status updated, but shortlist email failed to send.';
          }
          mailReport = { ok: mailResult.success, provider: mailResult.provider, attempts: mailResult.attempts };
        }
      } catch (emailError) {
        console.error('Failed to send shortlist email:', emailError);
        mailWarning = 'Status updated, but shortlist email failed to send.';
      }
    }

    res.json({
      id: app._id,
      status: app.status,
      mailWarning,
      mailReport
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// GET /api/admin/applications/:id/resume - Serves candidate resume
router.get('/applications/:id/resume', async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const legacyResume = (app.resume || '').trim();

    // 1. Redirect if it's an external web URL
    if (legacyResume.startsWith('http://') || legacyResume.startsWith('https://')) {
      return res.redirect(legacyResume);
    }

    // 2. Decode legacy data URL
    if (legacyResume.startsWith('data:')) {
      const matches = legacyResume.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = app.resumeFileName || 'resume.pdf';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Resume-Storage', 'legacy-inline');
        return res.send(buffer);
      }
    }

    res.status(404).json({ error: 'Resume is not available for this application' });
  } catch (error) {
    console.error('Error serving resume:', error);
    res.status(500).json({ error: 'Failed to serve resume' });
  }
});

// GET /api/admin/employees/progress - Get hired employees with project/task progress
router.get('/employees/progress', async (req, res) => {
  try {
    // 1. Get all applications where status is 'HIRED'
    const hiredApplications = await Application.find({ status: 'HIRED' })
      .populate('userId', 'name email role')
      .populate('jobId', 'title category')
      .sort({ updatedAt: -1 });

    const formattedEmployees = [];

    for (const app of hiredApplications) {
      // 2. Find or create EmployeeProgress record
      let progress = await EmployeeProgress.findOne({ applicationId: app._id });
      
      if (!progress) {
        // Create default onboarding tasks if none exist
        progress = new EmployeeProgress({
          applicationId: app._id,
          currentProject: 'Onboarding & Training',
          tasks: [
            { text: 'Complete code of conduct and document submission', completed: true, completedAt: new Date() },
            { text: 'Set up local development environment and database connections', completed: false },
            { text: 'Review architecture layout guidelines and components structure', completed: false }
          ]
        });
        await progress.save();
      }

      const appObj = app.toJSON();
      formattedEmployees.push({
        applicationId: app._id,
        user: appObj.userId || { name: 'Unknown Candidate', email: 'unknown@localsm.com' },
        job: appObj.jobId || { title: 'Unknown Role', category: 'General' },
        currentProject: progress.currentProject,
        tasks: progress.tasks,
        phone: app.phone,
        location: app.location || 'Remote',
        createdAt: app.createdAt
      });
    }

    res.json(formattedEmployees);
  } catch (error) {
    console.error('Error fetching employee progress:', error);
    res.status(500).json({ error: 'Failed to fetch employee progress' });
  }
});

// POST /api/admin/employees/progress - Update current project or manage tasks
router.post('/employees/progress', async (req, res) => {
  try {
    const { applicationId, currentProject, newTaskText, toggleTaskId, deleteTaskId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId is required' });
    }

    let progress = await EmployeeProgress.findOne({ applicationId });

    if (!progress) {
      progress = new EmployeeProgress({ applicationId });
    }

    // 1. Update current project name
    if (currentProject !== undefined) {
      progress.currentProject = String(currentProject).trim() || 'Onboarding & Training';
    }

    // 2. Add a new task
    if (newTaskText !== undefined) {
      const text = String(newTaskText).trim();
      if (text) {
        progress.tasks.push({ text, completed: false });
      }
    }

    // 3. Toggle a task completion status
    if (toggleTaskId !== undefined) {
      const task = progress.tasks.id(toggleTaskId);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date() : undefined;
      }
    }

    // 4. Delete a task
    if (deleteTaskId !== undefined) {
      progress.tasks.pull({ _id: deleteTaskId });
    }

    await progress.save();
    res.json(progress);
  } catch (error) {
    console.error('Error updating employee progress:', error);
    res.status(500).json({ error: 'Failed to update employee progress' });
  }
});

export default router;
