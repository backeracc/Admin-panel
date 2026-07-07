import mongoose from 'mongoose';

const trustedDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deviceToken: { type: String, required: true, unique: true },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete expired tokens
trustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
trustedDeviceSchema.index({ userId: 1 });

export default mongoose.model('TrustedDevice', trustedDeviceSchema);
