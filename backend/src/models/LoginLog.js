import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true },
    role: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: ['Success', 'Failed'], required: true },
  },
  { timestamps: true }
);

loginLogSchema.index({ email: 1 });
loginLogSchema.index({ createdAt: -1 });

export default mongoose.model('LoginLog', loginLogSchema);
