import { DirectRoomModel } from '../../models/DirectRoom.js';
import { UserModel } from '../../models/User.js';
import { canStartDirectChat, type AgeGroup } from '../age/ageClassificationService.js';

export const AGE_GROUP_CHAT_RESTRICTED_MESSAGE =
  '연령 그룹 정책에 따라 이 사용자와 1대1 채팅을 이용할 수 없습니다.';

export async function loadDirectChatPolicy(roomId: string, requesterUserId?: string) {
  const room = await DirectRoomModel.findOne({ roomId, active: true }).lean();
  if (!room || room.memberUserIds.length !== 2) return { allowed: false as const, code: 'ROOM_NOT_FOUND' };
  const memberIds = room.memberUserIds.map(String);
  if (requesterUserId && !memberIds.includes(requesterUserId)) return { allowed: false as const, code: 'ROOM_FORBIDDEN' };
  const users = await UserModel.find({ _id: { $in: room.memberUserIds } }).select('ageGroup profile.chatEnabled displayName explicitInterests').lean();
  if (users.length !== 2) return { allowed: false as const, code: 'USER_NOT_FOUND' };
  const allowed = users.every(user => user.profile?.chatEnabled !== false) &&
    canStartDirectChat(
      { ageGroup: users[0]!.ageGroup as AgeGroup },
      { ageGroup: users[1]!.ageGroup as AgeGroup },
    );
  return allowed
    ? { allowed: true as const, room, users }
    : { allowed: false as const, code: 'AGE_GROUP_CHAT_RESTRICTED' };
}

export async function canUsersStartDirectChat(userIds: [string, string]) {
  const users = await UserModel.find({ _id: { $in: userIds } }).select('ageGroup profile.chatEnabled').lean();
  return users.length === 2 &&
    users.every(user => user.profile?.chatEnabled !== false) &&
    canStartDirectChat(
      { ageGroup: users[0]!.ageGroup as AgeGroup },
      { ageGroup: users[1]!.ageGroup as AgeGroup },
    );
}
