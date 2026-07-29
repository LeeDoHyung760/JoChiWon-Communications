import { Schema, model } from 'mongoose';
const directMessageSchema = new Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  roomId: { type: String, required: true, index: true },
  senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 500 },
  type: { type: String, enum: ['user'], default: 'user' },
  sentAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false });
export const DirectMessageModel = model('DirectMessage', directMessageSchema);

