export const UNIFIED_PROFILE_DOMAINS = [
  'festivalFood', 'gardenNature', 'arts', 'clubs', 'collaborationProjects',
] as const;

export type UnifiedProfileDomain = typeof UNIFIED_PROFILE_DOMAINS[number];

export const PROFILE_COMPLETION_WEIGHTS: Readonly<Record<UnifiedProfileDomain, number>> = {
  festivalFood: 20,
  gardenNature: 20,
  arts: 20,
  clubs: 20,
  collaborationProjects: 20,
};

export interface UnifiedUserProfile {
  userId: string;
  profileCompletion: number;
  festivalFood: {
    festivalTypes: string[];
    foodTypes: string[];
    participationStyles: string[];
    evidenceCount: number;
  };
  gardenNature: {
    topFlowers: Array<{
      flowerId: string;
      displayName: string;
      meanings: string[];
      interestScore: number;
    }>;
    observationStyle?: string;
    exploredFlowerCount: number;
    evidenceCount: number;
  };
  arts: {
    preferredGenres: string[];
    viewingStyles: string[];
    evidenceCount: number;
  };
  clubs: {
    categories: string[];
    preferredGroupSize?: string;
    participationRole?: string;
    evidenceCount: number;
  };
  collaborationProjects: {
    interests: string[];
    preferredRoles: string[];
    collaborationStyle?: string;
    availableTimes: string[];
    evidenceCount: number;
  };
  placeBehavior: {
    visitedPlaceIds: string[];
    mostVisitedPlaceIds: string[];
    longestStayedPlaceIds: string[];
    revisitPlaceIds: string[];
  };
  completedDomains: UnifiedProfileDomain[];
  updatedAt: string;
}

export function emptyUnifiedUserProfile(userId: string, updatedAt = new Date().toISOString()): UnifiedUserProfile {
  return {
    userId,
    profileCompletion: 0,
    festivalFood: { festivalTypes: [], foodTypes: [], participationStyles: [], evidenceCount: 0 },
    gardenNature: { topFlowers: [], exploredFlowerCount: 0, evidenceCount: 0 },
    arts: { preferredGenres: [], viewingStyles: [], evidenceCount: 0 },
    clubs: { categories: [], evidenceCount: 0 },
    collaborationProjects: { interests: [], preferredRoles: [], availableTimes: [], evidenceCount: 0 },
    placeBehavior: { visitedPlaceIds: [], mostVisitedPlaceIds: [], longestStayedPlaceIds: [], revisitPlaceIds: [] },
    completedDomains: [],
    updatedAt,
  };
}

export function calculateUnifiedProfileCompletion(profile: Pick<UnifiedUserProfile, UnifiedProfileDomain>): {
  profileCompletion: number;
  completedDomains: UnifiedProfileDomain[];
} {
  const completedDomains = UNIFIED_PROFILE_DOMAINS.filter((domain) => {
    if (domain === 'festivalFood') return profile.festivalFood.festivalTypes.length > 0 || profile.festivalFood.foodTypes.length > 0;
    if (domain === 'gardenNature') return profile.gardenNature.topFlowers.some((flower) => flower.interestScore > 0);
    if (domain === 'arts') return profile.arts.preferredGenres.length > 0 || profile.arts.evidenceCount > 0;
    if (domain === 'clubs') return profile.clubs.categories.length > 0;
    return profile.collaborationProjects.interests.length > 0 ||
      profile.collaborationProjects.preferredRoles.length > 0 ||
      Boolean(profile.collaborationProjects.collaborationStyle);
  });
  const profileCompletion = Math.max(0, Math.min(100,
    completedDomains.reduce((sum, domain) => sum + PROFILE_COMPLETION_WEIGHTS[domain], 0),
  ));
  return { profileCompletion, completedDomains };
}
