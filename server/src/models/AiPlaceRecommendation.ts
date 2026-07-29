import { Schema, model } from 'mongoose';

const routeSchema = new Schema({
  placeId: { type: String, required: true, trim: true },
  order: { type: Number, required: true, min: 1, max: 4 },
  recommendedMinutes: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true, trim: true },
  experienceConnection: { type: String, required: true, trim: true },
  localEconomyConnection: { type: String, required: true, trim: true },
}, { _id: false });

const aiPlaceRecommendationSchema = new Schema({
  requesterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companionUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  promptVersion: { type: String, required: true, trim: true },
  modelName: { type: String, required: true, trim: true },
  inputSummary: {
    requesterInterests: { type: [String], default: [] },
    companionInterests: { type: [String], default: [] },
    sharedInterests: { type: [String], default: [] },
    wantedActivities: { type: [String], default: [] },
    candidatePlaceIds: { type: [String], required: true },
  },
  recommendationTitle: { type: String, required: true, trim: true },
  userSummary: { type: String, required: true, trim: true },
  sharedInterests: { type: [String], default: [] },
  conversationStarters: { type: [String], default: [] },
  route: { type: [routeSchema], required: true },
  totalEstimatedMinutes: { type: Number, required: true, min: 1 },
  routeConcept: { type: String, required: true, trim: true },
  cautions: { type: [String], default: [] },
}, { timestamps: true, versionKey: false });

export const AiPlaceRecommendationModel = model('AiPlaceRecommendation', aiPlaceRecommendationSchema);

