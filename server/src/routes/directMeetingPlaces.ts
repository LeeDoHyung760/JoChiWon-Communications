import { Router } from 'express';
import { roomStore } from '../rooms/roomStore.js';
import { getSocketServer } from '../socket/socketRuntime.js';
import type { DirectMessage, DirectRoomMeetingPlace } from '../../../shared/socket-events.js';

export const directMeetingPlacesRouter = Router();

function context(roomId: string, requesterId: string) {
  const room = roomStore.directRooms.get(roomId);
  const io = getSocketServer();
  const player = roomStore.players.get(requesterId);
  if (!room) return { error: { status: 404, message: '존재하지 않는 채팅방입니다.' } };
  if (!requesterId || !io?.sockets.sockets.has(requesterId) || !player || !room.participants.some(item => item.id === requesterId)) {
    return { error: { status: 403, message: '이 채팅방의 참여자만 모임 장소를 등록할 수 있습니다.' } };
  }
  if (!room.active) return { error: { status: 409, message: '종료된 채팅방에서는 모임 장소를 변경할 수 없습니다.' } };
  const other = room.participants.find(item => item.id !== requesterId);
  if (!other || roomStore.isBlocked(requesterId, other.id)) return { error: { status: 403, message: '차단 관계에서는 모임 장소를 등록할 수 없습니다.' } };
  return { room, io, player };
}

directMeetingPlacesRouter.get('/:directRoomId/meeting-place', (req, res) => {
  const result = context(String(req.params.directRoomId), req.get('X-Socket-Id')?.trim() ?? '');
  if (result.error) return res.status(result.error.status).json({ error: result.error.message });
  return res.json({ meetingPlace: result.room!.meetingPlace ?? null });
});

directMeetingPlacesRouter.put('/:directRoomId/meeting-place', (req, res) => {
  const roomId = String(req.params.directRoomId);
  const requesterId = req.get('X-Socket-Id')?.trim() ?? '';
  const result = context(roomId, requesterId);
  if (result.error) return res.status(result.error.status).json({ error: result.error.message });
  const recommendationId = typeof req.body?.recommendationId === 'string' ? req.body.recommendationId : '';
  const placeId = typeof req.body?.placeId === 'string' ? req.body.placeId : '';
  if (!recommendationId || !placeId) return res.status(400).json({ error: '추천 결과와 장소를 확인해 주세요.' });
  const selected = roomStore.getRecommendedPlace(recommendationId, roomId, placeId);
  if (selected.category === 'expired') return res.status(410).json({ error: '추천 결과가 만료되었습니다. 다시 추천받아 주세요.' });
  if (selected.category === 'invalid') return res.status(400).json({ error: '추천 결과에 포함되지 않은 장소입니다.' });

  const previous = result.room!.meetingPlace;
  const place = selected.place;
  const meetingPlace: DirectRoomMeetingPlace = {
    roomId, placeId: place.id, placeName: place.name, category: place.category,
    address: place.address, roadAddress: place.roadAddress, externalUrl: place.externalUrl,
    selectedByUserId: requesterId, selectedByNickname: result.player!.nickname,
    selectedAt: new Date().toISOString(), status: 'confirmed'
  };
  result.room!.meetingPlace = meetingPlace;
  const message: DirectMessage = {
    id: crypto.randomUUID(), directRoomId: roomId, senderId: 'system', nickname: '공지',
    message: previous ? `${result.player!.nickname}님이 모임 장소를 변경했습니다.` : `${result.player!.nickname}님이 모임 장소를 등록했습니다.`,
    createdAt: Date.now(), type: 'system-meeting-place', meetingPlace,
    ...(previous ? { previousMeetingPlace: previous } : {})
  };
  roomStore.addDirectMessage(message);
  result.io!.to(roomId).emit('directMeetingPlaceUpdated', { roomId, meetingPlace });
  result.io!.to(roomId).emit('directMessageReceived', message);
  return res.json({ ok: true, meetingPlace, changed: Boolean(previous) });
});

directMeetingPlacesRouter.delete('/:directRoomId/meeting-place', (req, res) => {
  const roomId = String(req.params.directRoomId);
  const result = context(roomId, req.get('X-Socket-Id')?.trim() ?? '');
  if (result.error) return res.status(result.error.status).json({ error: result.error.message });
  const previous = result.room!.meetingPlace;
  if (!previous) return res.json({ ok: true, meetingPlace: null });
  delete result.room!.meetingPlace;
  const message: DirectMessage = {
    id: crypto.randomUUID(), directRoomId: roomId, senderId: 'system', nickname: '공지',
    message: '모임 장소 등록이 해제되었습니다.', createdAt: Date.now(),
    type: 'system-meeting-place', meetingPlace: null, previousMeetingPlace: previous
  };
  roomStore.addDirectMessage(message);
  result.io!.to(roomId).emit('directMeetingPlaceUpdated', { roomId, meetingPlace: null });
  result.io!.to(roomId).emit('directMessageReceived', message);
  return res.json({ ok: true, meetingPlace: null });
});
