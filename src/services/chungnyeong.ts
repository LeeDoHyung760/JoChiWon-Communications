import type { ChungnyeongChatResponse } from '../../shared/chungnyeong';
import { API_BASE_URL } from '../config/api';

export async function chatWithChungnyeong(message: string): Promise<ChungnyeongChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chungnyeong/chat`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? '충녕이와 연결하지 못했어요.');
  return body as ChungnyeongChatResponse;
}

export async function sendChungnyeongProfileRequest(recruitmentId: string, message: string) {
  const response = await fetch(`${API_BASE_URL}/chungnyeong/profile-requests`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recruitmentId, message }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? '프로필을 전달하지 못했어요.');
  return body.request;
}
