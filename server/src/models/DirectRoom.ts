import { Schema, model } from 'mongoose';
const directRoomSchema = new Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  memberUserIds: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    validate: {
      validator: (values: unknown[]) => values.length === 2 && new Set(values.map(String)).size === 2,
      message: '1대1 채팅방에는 서로 다른 사용자 두 명이 필요합니다.',
    },
  },
  active: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });
export const DirectRoomModel = model('DirectRoom', directRoomSchema);

