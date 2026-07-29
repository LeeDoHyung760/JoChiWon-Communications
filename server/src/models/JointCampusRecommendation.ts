import { Schema, model } from 'mongoose';

const routeItemSchema = new Schema({
  placeId: { type: String, required: true },
  order: { type: Number, required: true },
  recommendedMinutes: { type: Number, required: true },
  reasonForRequester: { type: String, required: true },
  reasonForCompanion: { type: String, required: true },
  sharedReason: { type: String, required: true },
  experienceConnection: { type: String, required: true },
  localEconomyConnection: { type: String, required: true },
}, { _id: false });

const jointCampusRecommendationSchema = new Schema({
  roomId: { type: String, required: true, index: true },
  requesterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companionUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  promptVersion: { type: String, required: true },
  modelName: { type: String, required: true },
  inputSummary: {
    requesterExplicitInterests: { type: [String], default: [] },
    companionExplicitInterests: { type: [String], default: [] },
    requesterInferredInterests: { type: [String], default: [] },
    companionInferredInterests: { type: [String], default: [] },
    candidatePlaceIds: { type: [String], default: [] },
  },
  result: {
    recommendationTitle: { type: String, required: true },
    sharedInterestSummary: { type: String, required: true },
    usedExplicitInterests: { type: [String], default: [] },
    usedInferredInterests: { type: [String], default: [] },
    route: { type: [routeItemSchema], required: true },
    conversationStarters: { type: [String], default: [] },
    totalEstimatedMinutes: { type: Number, required: true },
    routeConcept: { type: String, required: true },
    cautions: { type: [String], default: [] },
  },
  status: { type: String, enum: ['success', 'failed'], required: true, default: 'success' },
}, { timestamps: true, versionKey: false });

export const JointCampusRecommendationModel = model(
  'JointCampusRecommendation',
  jointCampusRecommendationSchema,
);
