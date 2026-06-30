import mongoose from 'mongoose';

const employeeProgressSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    currentProject: { type: String, default: 'Onboarding & Training' },
    tasks: [
      {
        text: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model('EmployeeProgress', employeeProgressSchema);
