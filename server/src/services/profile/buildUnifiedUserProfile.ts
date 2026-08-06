import { ClubModel } from '../../models/Club.js';
import { UserModel } from '../../models/User.js';
import { FLOWER_CATALOG_BY_ID } from '../../../../shared/flower-catalog.js';
import {
  calculateUnifiedProfileCompletion,
  emptyUnifiedUserProfile,
  type UnifiedUserProfile,
} from '../../../../shared/unified-user-profile.js';

type StringMap = Map<string, number> | Record<string, number> | undefined;
type Evidence = { kind?: unknown; values?: unknown };
type UnifiedSourceUser = {
  _id: unknown;
  updatedAt?: Date;
  profile?: {
    gardenNature?: { flowerInterests?: Array<Record<string, unknown>> };
    clubs?: { interestedCategories?: string[]; preferredGroupSize?: string; participationRole?: string; evidence?: Evidence[] };
    collaborationProjects?: { interests?: string[]; preferredRoles?: string[]; collaborationStyle?: string; availableTimes?: string[]; evidence?: Evidence[] };
    placeBehavior?: { records?: Array<{placeId?:string;visitCount?:number;activeStaySeconds?:number;revisitCount?:number}> };
  };
  experienceHarness?: {
    performance?: { scores?: StringMap; evidence?: string[] };
    food?: { scores?: StringMap; evidence?: string[]; sessionSummary?: Record<string, unknown> };
    festival?: { scores?: StringMap; evidence?: string[]; sessionSummary?: Record<string, unknown> };
    profileFragments?: Array<Record<string, unknown>>;
    activityRecords?: Array<{mapId?:string}>;
  };
};

type UnifiedSourceClub = {
  category?: string;
  tags?: string[];
  capacity?: number;
  ownerId?: string;
  members?: Array<{userId?:string;role?:string}>;
};

const unique = (values: unknown[], limit = 30): string[] => [...new Set(values
  .filter((value): value is string => typeof value === 'string')
  .map((value) => value.trim()).filter(Boolean))].slice(0, limit);

const scoresOf = (scores: StringMap): Record<string, number> => scores instanceof Map
  ? Object.fromEntries(scores)
  : scores && typeof scores === 'object' ? scores : {};

const positiveKeys = (scores: StringMap, excluded: string[] = []) => Object.entries(scoresOf(scores))
  .filter(([key, value]) => !excluded.includes(key) && Number(value) > 0)
  .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]))
  .map(([key]) => key);

const fragmentSummaries = (fragments: Array<Record<string, unknown>> | undefined, source: string) =>
  (fragments ?? []).filter((fragment) => fragment.source === source)
    .map((fragment) => fragment.sessionSummary)
    .filter((summary): summary is Record<string, unknown> => Boolean(summary && typeof summary === 'object'));

const stringArrays = (objects: Record<string, unknown>[], keys: string[]) => unique(objects.flatMap((object) =>
  keys.flatMap((key) => Array.isArray(object[key]) ? object[key] as unknown[] : []),
));

function inferObservationStyle(flowers: Array<Record<string, unknown>>): string | undefined {
  if (!flowers.length) return undefined;
  const info = flowers.reduce((sum, flower) => sum + Number(flower.totalInfoViewSeconds ?? 0), 0);
  const nearby = flowers.reduce((sum, flower) => sum + Number(flower.totalNearbySeconds ?? 0), 0);
  const revisits = flowers.reduce((sum, flower) => sum + Number(flower.revisitCount ?? 0), 0);
  if (revisits > 0) return 'revisit';
  if (info > nearby) return 'information-focused';
  if (nearby > 0) return 'observation-focused';
  return 'exploration';
}

export function assembleUnifiedUserProfile(user: UnifiedSourceUser, clubs: UnifiedSourceClub[]): UnifiedUserProfile {
  const userId = String(user._id);
  const result = emptyUnifiedUserProfile(userId, user.updatedAt?.toISOString() ?? new Date().toISOString());
  const harness = user.experienceHarness ?? {};
  const festivalSummaries = [harness.festival?.sessionSummary, ...fragmentSummaries(harness.profileFragments, 'sejong_festival_booth')]
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'));
  const foodSummaries = [harness.food?.sessionSummary, ...fragmentSummaries(harness.profileFragments, 'sejong_food_trucks')]
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'));

  result.festivalFood.festivalTypes = unique([
    ...stringArrays(festivalSummaries, ['mostViewedCategories']),
    ...positiveKeys(harness.festival?.scores, ['participation','exploration','social','recording','visitIntent','planningStyle','strongInterest','festivalCompletion']),
  ]);
  result.festivalFood.foodTypes = unique([
    ...stringArrays(foodSummaries, ['mostViewedCategories']),
    ...positiveKeys(harness.food?.scores, ['recording','visitIntent','routePlanning','practicalDiningStyle','sejongFoodExploration']),
  ]);
  result.festivalFood.participationStyles = unique([
    ...positiveKeys(harness.festival?.scores).filter((key) => ['participation','exploration','social','recording','visitIntent','planningStyle','strongInterest','festivalCompletion'].includes(key)),
    ...positiveKeys(harness.food?.scores).filter((key) => ['recording','visitIntent','routePlanning','practicalDiningStyle','sejongFoodExploration'].includes(key)),
  ]);
  result.festivalFood.evidenceCount = (harness.festival?.evidence?.length ?? 0) + (harness.food?.evidence?.length ?? 0);

  const flowerInterests = (user.profile?.gardenNature?.flowerInterests ?? [])
    .filter((flower) => typeof flower.flowerId === 'string' && Number(flower.interestScore ?? 0) > 0);
  result.gardenNature.topFlowers = flowerInterests.map((flower) => {
    const flowerId = String(flower.flowerId);
    const catalog = FLOWER_CATALOG_BY_ID.get(flowerId as never);
    return { flowerId, displayName: catalog?.displayName ?? flowerId, meanings: [...(catalog?.meanings ?? [])], interestScore: Number(flower.interestScore ?? 0) };
  }).sort((a, b) => b.interestScore - a.interestScore || a.flowerId.localeCompare(b.flowerId)).slice(0, 5);
  result.gardenNature.exploredFlowerCount = flowerInterests.length;
  result.gardenNature.evidenceCount = flowerInterests.reduce((sum, flower) => sum + Number(flower.infoViewCount ?? 0) + Number(flower.nearbyVisitCount ?? 0) + Number(flower.revisitCount ?? 0), 0);
  result.gardenNature.observationStyle = inferObservationStyle(flowerInterests);
  if (!result.gardenNature.observationStyle) delete result.gardenNature.observationStyle;

  const genreKeys = ['musical','play','jazz','traditional','classical'];
  result.arts.preferredGenres = positiveKeys(harness.performance?.scores).filter((key) => genreKeys.includes(key));
  result.arts.viewingStyles = positiveKeys(harness.performance?.scores).filter((key) => !['culture', ...genreKeys].includes(key));
  result.arts.evidenceCount = harness.performance?.evidence?.length ?? 0;

  const storedClubs = user.profile?.clubs;
  const joinedCategories = clubs.flatMap((club) => [club.category, ...(club.tags ?? [])]);
  result.clubs.categories = unique([...(storedClubs?.interestedCategories ?? []), ...joinedCategories]);
  result.clubs.preferredGroupSize = storedClubs?.preferredGroupSize;
  result.clubs.participationRole = storedClubs?.participationRole ?? clubs.map((club) =>
    club.ownerId === userId ? 'chair' : club.members?.find((member) => member.userId === userId)?.role,
  ).find(Boolean);
  result.clubs.evidenceCount = clubs.length + (storedClubs?.evidence?.length ?? 0);
  if (!result.clubs.preferredGroupSize) delete result.clubs.preferredGroupSize;
  if (!result.clubs.participationRole) delete result.clubs.participationRole;

  const projects = user.profile?.collaborationProjects;
  result.collaborationProjects.interests = unique(projects?.interests ?? []);
  result.collaborationProjects.preferredRoles = unique(projects?.preferredRoles ?? []);
  result.collaborationProjects.collaborationStyle = projects?.collaborationStyle;
  result.collaborationProjects.availableTimes = unique(projects?.availableTimes ?? []);
  result.collaborationProjects.evidenceCount = projects?.evidence?.length ?? 0;
  if (!result.collaborationProjects.collaborationStyle) delete result.collaborationProjects.collaborationStyle;

  const records = (user.profile?.placeBehavior?.records ?? []).filter((record) => record.placeId);
  result.placeBehavior.visitedPlaceIds = unique(records.map((record) => record.placeId));
  result.placeBehavior.mostVisitedPlaceIds = records.filter((record) => Number(record.visitCount ?? 0) > 0)
    .sort((a,b) => Number(b.visitCount ?? 0) - Number(a.visitCount ?? 0)).slice(0,5).map((record) => record.placeId!);
  result.placeBehavior.longestStayedPlaceIds = records.filter((record) => Number(record.activeStaySeconds ?? 0) > 0)
    .sort((a,b) => Number(b.activeStaySeconds ?? 0) - Number(a.activeStaySeconds ?? 0)).slice(0,5).map((record) => record.placeId!);
  result.placeBehavior.revisitPlaceIds = unique([
    ...records.filter((record) => Number(record.revisitCount ?? 0) > 0 || Number(record.visitCount ?? 0) > 1).map((record) => record.placeId),
    ...(flowerInterests.some((flower) => Number(flower.revisitCount ?? 0) > 0) ? ['garden'] : []),
  ]);

  const completion = calculateUnifiedProfileCompletion(result);
  result.profileCompletion = completion.profileCompletion;
  result.completedDomains = completion.completedDomains;
  return result;
}

export async function buildUnifiedUserProfile(userId: string): Promise<UnifiedUserProfile> {
  const user = await UserModel.findById(userId)
    .select('profile.gardenNature profile.clubs profile.collaborationProjects profile.placeBehavior experienceHarness updatedAt')
    .lean<UnifiedSourceUser>();
  if (!user) throw new Error('USER_NOT_FOUND');
  const clubs = await ClubModel.find({ $or: [{ ownerId: userId }, { 'members.userId': userId }] })
    .select('category tags capacity ownerId members').lean<UnifiedSourceClub[]>();
  return assembleUnifiedUserProfile(user, clubs);
}
