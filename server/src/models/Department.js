import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { collection: 'department', timestamps: true }
);

export default mongoose.model('Department', departmentSchema);
