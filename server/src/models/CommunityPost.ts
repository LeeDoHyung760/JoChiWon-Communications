import { randomUUID } from 'node:crypto';
import { model, Schema } from 'mongoose';

const communityCommentSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      default: randomUUID,
    },
    author: {
      type: String,
      required: true,
      trim: true,
      default: '익명',
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const recruitmentApplicationSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      default: randomUUID,
    },
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    introduction: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    interests: {
      type: [String],
      default: [],
    },
    travelStyle: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const communityPostSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: randomUUID,
    },
    author: {
      type: String,
      required: true,
      trim: true,
      default: '익명',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: '자유게시판',
    },
    likes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    likedBy: {
      type: [String],
      default: [],
    },
    comments: {
      type: [communityCommentSchema],
      default: [],
    },
    applications: {
      type: [recruitmentApplicationSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

communityPostSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    const plainObject = returnedObject as Record<string, unknown>;

    delete plainObject._id;

    return plainObject;
  },
});

export const CommunityPostModel = model(
  'CommunityPost',
  communityPostSchema,
);
