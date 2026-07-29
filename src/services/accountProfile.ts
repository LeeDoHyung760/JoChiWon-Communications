import { API_BASE_URL } from '../config/api';
import type { UserProfile } from '../types';

export async function loadAccountProfile(): Promise<UserProfile | null> {
  const response = await fetch(`${API_BASE_URL}/account/me`, { credentials: 'include' });
  if (!response.ok) return null;
  const body = await response.json() as { data?: { profile?: UserProfile | null } };
  return body.data?.profile ?? null;
}

export async function saveAccountProfile(profile: UserProfile): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/account/me/profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...profile,
      recordVisibility: profile.recordVisibility ?? 'public',
      chatEnabled: profile.chatEnabled ?? true,
    }),
  });
  if (!response.ok) throw new Error('프로필을 서버에 저장하지 못했습니다.');
}

