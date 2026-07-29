import { API_BASE_URL } from '../config/api';

export type JointCampusRecommendationRequest = {
  roomId: string;
  constraints?: {
    availableMinutes?: number;
    transportation?: 'walk' | 'public_transport' | 'car' | 'unknown';
    budgetPerPerson?: number;
    preferredMood?: string[];
    avoidActivities?: string[];
  };
};

async function jsonRequest(path: string, method: 'POST' | 'PUT', input: unknown) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? '요청 처리에 실패했습니다.');
  return body;
}

export const requestJointCampusRecommendation = (input: JointCampusRecommendationRequest) =>
  jsonRequest('/ai/joint-campus/recommendations', 'POST', input);

export const saveOnboarding = (input: {
  displayName: string;
  avatar: {
    characterId: string;
    skinId?: string;
    hairId?: string;
    outfitId?: string;
    accessoryIds?: string[];
    colorOptions?: Record<string, string>;
  };
  explicitInterests: string[];
}) => jsonRequest('/profile/onboarding', 'PUT', input);

export const confirmBirth = (input: {
  birthyear: string;
  birthday: string;
  birthdayType: 'SOLAR' | 'LUNAR' | 'UNKNOWN';
  consent: true;
}) => jsonRequest('/profile/birth-confirmation', 'PUT', input);
