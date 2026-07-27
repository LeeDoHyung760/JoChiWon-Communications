import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, DirectMessage, DirectRequest, DirectRoom, DirectRoomMeetingPlace, ServerToClientEvents } from '../../../shared/socket-events.js';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;
const base = 'http://localhost:3001';
const once = <T>(socket: Client, event: keyof ServerToClientEvents) => new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out: ${String(event)}`)), 45_000);
  socket.once(event as never, ((value: T) => { clearTimeout(timer); resolve(value); }) as never);
});
const connect = (nickname: string) => new Promise<Client>((resolve, reject) => {
  const socket: Client = io(base, { transports: ['websocket'] });
  socket.once('connect', () => { socket.emit('joinMap', { mapId: 'jochwon-station', nickname, appearance: { hair: 'short', face: 'smile', top: 'green', bottom: 'navy', shoes: 'black' }, model:'chungnyeong', x: 100, y: 100 }); resolve(socket); });
  socket.once('connect_error', reject);
});
const meetingRequest = (method: 'PUT' | 'DELETE', roomId: string, socketId: string, body?: object) => fetch(`${base}/api/direct-rooms/${encodeURIComponent(roomId)}/meeting-place`, { method, headers: { 'Content-Type': 'application/json', 'X-Socket-Id': socketId }, ...(body ? { body: JSON.stringify(body) } : {}) });

const a = await connect('장소테스트A'), b = await connect('장소테스트B');
try {
  const requested = once<DirectRequest>(b, 'directChatRequested'); a.emit('directChatRequest', b.id!); const request = await requested;
  const startedA = once<DirectRoom>(a, 'directChatStarted'), startedB = once<DirectRoom>(b, 'directChatStarted'); b.emit('directChatAccept', request.requestId); const [room] = await Promise.all([startedA, startedB]);
  const send = async (client: Client, text: string) => { const received = once<DirectMessage>(a, 'directMessageReceived'); client.emit('directMessage', { directRoomId: room.id, message: text }); await received; };
  await send(a, '영화관 갈래?'); await send(b, '좋아. 영화 보자.');
  const completed = once<{ directRoomId: string; message: DirectMessage }>(a, 'directRecommendationCompleted');
  const recommendationResponse = await fetch(`${base}/api/direct-rooms/${room.id}/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Socket-Id': a.id! }, body: '{}' });
  if (!recommendationResponse.ok) throw new Error(`Recommendation failed: ${recommendationResponse.status}`);
  const recommendationMessage = (await completed).message;
  const recommendation = recommendationMessage.recommendation, place = recommendation?.places[0];
  if (!recommendation || !place) throw new Error('No recommended place');
  console.log(`[Meeting Verify] map host: ${place.externalUrl ? new URL(place.externalUrl).hostname : 'missing'}`);

  const updateA = once<{ roomId: string; meetingPlace: DirectRoomMeetingPlace | null }>(a, 'directMeetingPlaceUpdated');
  const updateB = once<{ roomId: string; meetingPlace: DirectRoomMeetingPlace | null }>(b, 'directMeetingPlaceUpdated');
  const noticeA = once<DirectMessage>(a, 'directMessageReceived'), noticeB = once<DirectMessage>(b, 'directMessageReceived');
  const saved = await meetingRequest('PUT', room.id, a.id!, { recommendationId: recommendation.recommendationId, placeId: place.id });
  const [syncedA, syncedB, systemA, systemB] = await Promise.all([updateA, updateB, noticeA, noticeB]);
  console.log(`[Meeting Verify] registration: ${saved.status}`);
  console.log(`[Meeting Verify] both participants synced: ${syncedA.meetingPlace?.placeId === place.id && syncedB.meetingPlace?.placeId === place.id}`);
  console.log(`[Meeting Verify] system notice synced: ${systemA.type === 'system-meeting-place' && systemA.id === systemB.id}`);
  const current = await fetch(`${base}/api/direct-rooms/${room.id}/meeting-place`, { headers: { 'X-Socket-Id': b.id! } });
  const currentBody = await current.json() as { meetingPlace: DirectRoomMeetingPlace | null };
  console.log(`[Meeting Verify] current place reload: ${current.status}; matches=${currentBody.meetingPlace?.placeId === place.id}`);
  const next = recommendation.places[1];
  if (next) {
    const changedA = once<{ roomId: string; meetingPlace: DirectRoomMeetingPlace | null }>(a, 'directMeetingPlaceUpdated');
    const changedB = once<{ roomId: string; meetingPlace: DirectRoomMeetingPlace | null }>(b, 'directMeetingPlaceUpdated');
    const changed = await meetingRequest('PUT', room.id, b.id!, { recommendationId: recommendation.recommendationId, placeId: next.id });
    const [nextA, nextB] = await Promise.all([changedA, changedB]);
    console.log(`[Meeting Verify] change: ${changed.status}; both synced=${nextA.meetingPlace?.placeId === next.id && nextB.meetingPlace?.placeId === next.id}`);
  }
  console.log(`[Meeting Verify] tampered place denied: ${(await meetingRequest('PUT', room.id, a.id!, { recommendationId: recommendation.recommendationId, placeId: 'tampered' })).status}`);
  console.log(`[Meeting Verify] expired recommendation denied: ${(await meetingRequest('PUT', room.id, a.id!, { recommendationId: 'expired', placeId: place.id })).status}`);

  const outsider = await connect('장소테스트외부인');
  try { console.log(`[Meeting Verify] outsider denied: ${(await meetingRequest('PUT', room.id, outsider.id!, { recommendationId: recommendation.recommendationId, placeId: place.id })).status}`); } finally { outsider.disconnect(); }
  const clearA = once<{ roomId: string; meetingPlace: DirectRoomMeetingPlace | null }>(a, 'directMeetingPlaceUpdated');
  const clearB = once<{ roomId: string; meetingPlace: DirectRoomMeetingPlace | null }>(b, 'directMeetingPlaceUpdated');
  const removed = await meetingRequest('DELETE', room.id, b.id!); const [removedA, removedB] = await Promise.all([clearA, clearB]);
  console.log(`[Meeting Verify] removal: ${removed.status}; both synced: ${removedA.meetingPlace === null && removedB.meetingPlace === null}`);
} finally { a.disconnect(); b.disconnect(); }
