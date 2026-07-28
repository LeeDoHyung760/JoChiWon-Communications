import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    kakaoId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    nickname: {
      type: String,
      required: true,
      trim: true,
    },

    profileImage: {
      type: String,
      default: '',
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

export const UserModel = model(
  'User',
  userSchema,
);