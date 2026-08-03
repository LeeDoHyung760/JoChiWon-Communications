import { Schema, model } from 'mongoose';

const recruitmentProfileRequestSchema = new Schema({
  requesterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recruitmentId: { type: String, required: true, trim: true, maxlength: 100 },
  recruitmentTitle: { type: String, required: true, trim: true, maxlength: 100 },
  message: { type: String, required: true, trim: true, maxlength: 300 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
}, { timestamps: true, versionKey: false });

recruitmentProfileRequestSchema.index({ requesterUserId: 1, recruitmentId: 1 }, { unique: true });

export const RecruitmentProfileRequestModel = model('RecruitmentProfileRequest', recruitmentProfileRequestSchema);

