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

    email: { type: String, trim: true, lowercase: true, select: false },
    displayName: { type: String, trim: true, minlength: 2, maxlength: 20 },
    profileImageUrl: { type: String, trim: true },
    avatar: {
      characterId: {
        type: String,
        enum: ['character_01', 'custom', 'chungnyeong', 'girl1', 'boy1', 'cloths', 'women'],
      },
      skinId: String,
      hairId: String,
      outfitId: String,
      accessoryIds: { type: [String], default: [] },
      colorOptions: { type: Map, of: String },
    },
    birthInfo: {
      birthyear: { type: String, match: /^\d{4}$/, select: false },
      birthday: { type: String, match: /^\d{4}$/, select: false },
      birthdayType: { type: String, enum: ['SOLAR', 'LUNAR', 'UNKNOWN'], select: false },
    },
    adultAt: Date,
    ageCheckedAt: Date,
    ageSource: {
      type: String,
      enum: ['kakao_account', 'user_input', 'unknown'],
      default: 'unknown',
    },
    explicitInterests: {
      type: [String],
      enum: ['plant', 'nature', 'festival', 'photo', 'cafe', 'food', 'culture', 'performance', 'shopping', 'workshop', 'walking', 'activity', 'study', 'technology', 'campus', 'local_business'],
      default: [],
    },
    onboardingCompleted: { type: Boolean, default: false },

    kakaoName: { type: String, trim: true, select: false },
    birthDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, select: false },
    birthdayType: { type: String, enum: ['SOLAR', 'LUNAR'], select: false },
    ageGroup: {
      type: String,
      enum: ['minor', 'adult', 'unknown'],
      required: true,
      default: 'unknown',
      index: true,
    },

    profile: {
      nickname: { type: String, trim: true, maxlength: 30 },
      mbti: { type: String, trim: true, maxlength: 10 },
      interests: { type: [String], default: [] },
      usagePurposes: { type: [String], default: [] },
      preferredPlaceCategories: { type: [String], default: [] },
      recordVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
      chatEnabled: { type: Boolean, default: true },
      model: {
        type: String,
        enum: ['custom', 'chungnyeong', 'girl1', 'boy1', 'cloths', 'women'],
        default: 'girl1',
      },
      character: {
        hair: { type: String, default: 'hair-original' },
        hairStyle: { type: String, enum: ['hair1', 'hair2', 'both'] },
        topStyle: { type: String, enum: ['style1', 'style2'], default: 'style1' },
        bottomStyle: { type: String, enum: ['style1', 'style2'], default: 'style1' },
        shoesStyle: { type: String, enum: ['style1', 'style2'], default: 'style1' },
        outfitStyle: { type: String, enum: ['outfit1', 'outfit2'], default: 'outfit1' },
        face: { type: String, default: 'face-original' },
        top: { type: String, default: 'top-original' },
        topLayer: String,
        bottom: { type: String, default: 'bottom-original' },
        shoes: { type: String, default: 'shoes-original' },
        accessory: String,
      },
    },

    lastPosition: {
      mapId: {
        type: String,
        enum: ['town', 'bear-tree-park', 'bear-play-zone', 'garden', 'campus', 'student-hall', 'project-room', 'government', 'government-central-plaza', 'government-policy-hall', 'government-observatory', 'sejong-smart-city', 'jochwon-station', 'traditional-market', 'jochwon-park', 'college-street'],
      },
      x: Number,
      z: Number,
      yaw: Number,
      savedAt: Date,
    },

    authProvider: {
      type: String,
      enum: ['kakao', 'demo'],
      required: true,
      default: 'kakao',
    },

    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

export const UserModel = model(
  'User',
  userSchema,
);
