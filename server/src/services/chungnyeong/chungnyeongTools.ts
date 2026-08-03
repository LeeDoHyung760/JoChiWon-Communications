import { UserModel } from '../../models/User.js';
import { RecruitmentProfileRequestModel } from '../../models/RecruitmentProfileRequest.js';
import { roomStore } from '../../rooms/roomStore.js';

const RECRUITMENTS = [
  { id: 'garden-photo', title: '수목원 사진 기록 프로젝트', summary: '계절별 식물과 풍경을 사진으로 기록해요.', tags: ['사진', '자연', '수목원', '기록'], members: 2, capacity: 5 },
  { id: 'night-festival', title: '세종 야간축제 탐방 프로젝트', summary: '공연과 야경을 함께 탐방하고 축제 지도를 만들어요.', tags: ['야간축제', '공연', '사진', '호수공원'], members: 2, capacity: 6 },
  { id: 'market-culture', title: '전통시장 문화 기록 프로젝트', summary: '상인 인터뷰와 로컬 먹거리를 기록해요.', tags: ['전통시장', '문화', '인터뷰', '먹거리'], members: 3, capacity: 5 },
];

const normalize = (value: string) => value.trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
const intersection = (left: string[], right: string[]) => {
  const wanted = new Set(left.map(normalize));
  return right.filter((value) => [...wanted].some((item) => normalize(value).includes(item) || item.includes(normalize(value))));
};

export async function getMyProfile(userId: string) {
  const user = await UserModel.findById(userId)
    .select('nickname displayName profile.nickname profile.interests profile.usagePurposes profile.chatEnabled')
    .lean();
  if (!user) throw new Error('USER_NOT_FOUND');
  return {
    userId,
    nickname: user.profile?.nickname || user.displayName || user.nickname,
    interests: (user.profile?.interests ?? []).slice(0, 10),
    purposes: (user.profile?.usagePurposes ?? []).slice(0, 8),
    availableForChat: user.profile?.chatEnabled !== false,
  };
}

export async function searchPeople(userId: string, input: { interests: string[]; availability: 'online' | 'available' | 'any'; purpose: string | null; limit: number }) {
  const me = await getMyProfile(userId);
  const users = await UserModel.find({ _id: { $ne: userId }, 'profile.recordVisibility': { $ne: 'private' } })
    .select('nickname displayName profile.nickname profile.interests profile.usagePurposes profile.chatEnabled')
    .limit(50).lean();
  const onlineByNickname = new Map([...roomStore.players.values()].map((player) => [normalize(player.nickname), player]));
  const requested = input.interests.length ? input.interests : me.interests;
  return {
    people: users.flatMap((user) => {
      const nickname = user.profile?.nickname || user.displayName || user.nickname;
      const player = onlineByNickname.get(normalize(nickname));
      const canReceiveChat = user.profile?.chatEnabled !== false;
      if (input.availability === 'online' && !player) return [];
      if (input.availability === 'available' && !canReceiveChat) return [];
      const publicInterests = (user.profile?.interests ?? []).slice(0, 10);
      const sharedInterests = intersection(requested, publicInterests).slice(0, 5);
      const sharedPurposes = input.purpose ? intersection([input.purpose], user.profile?.usagePurposes ?? []) : [];
      const matchScore = Math.min(100, 45 + sharedInterests.length * 15 + sharedPurposes.length * 10 + (player ? 5 : 0));
      return [{
        userId: String(user._id), nickname, matchScore, sharedInterests,
        currentArea: player ? approximateArea(player.mapId) : '오프라인',
        isOnline: Boolean(player), canReceiveChat,
      }];
    }).sort((a, b) => b.matchScore - a.matchScore).slice(0, Math.min(input.limit, 5)),
  };
}

export function searchOpenRecruitments(input: { interests: string[]; status: 'recruiting'; limit: number }) {
  const scored = RECRUITMENTS.map((item) => {
    const sharedInterests = intersection(input.interests, item.tags);
    return { ...item, sharedInterests, matchScore: Math.min(100, 55 + sharedInterests.length * 15) };
  }).sort((a, b) => b.matchScore - a.matchScore).slice(0, Math.min(input.limit, 5));
  return { recruitments: scored };
}

export async function getMyRequests(userId: string) {
  const requests = await RecruitmentProfileRequestModel.find({ requesterUserId: userId })
    .select('recruitmentId recruitmentTitle status updatedAt').sort({ updatedAt: -1 }).limit(10).lean();
  return { requests: requests.map((request) => ({
    id: request.recruitmentId,
    title: request.recruitmentTitle,
    status: request.status === 'approved' ? '승인 완료' : request.status === 'rejected' ? '승인 거절' : '승인 대기 중',
    updatedAt: request.updatedAt.toISOString(),
  })) };
}

export async function sendProfileRequest(userId: string, input: { recruitmentId: string; message: string }) {
  const recruitment = RECRUITMENTS.find((item) => item.id === input.recruitmentId);
  if (!recruitment) throw new Error('RECRUITMENT_NOT_FOUND');
  const request = await RecruitmentProfileRequestModel.findOneAndUpdate(
    { requesterUserId: userId, recruitmentId: recruitment.id },
    { $set: { recruitmentTitle: recruitment.title, message: input.message, status: 'pending' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).select('recruitmentId recruitmentTitle status updatedAt').lean();
  return { id: request.recruitmentId, title: request.recruitmentTitle, status: '승인 대기 중', updatedAt: request.updatedAt.toISOString() };
}

export function getSpaceGuide(input: { purpose: 'create_project' | 'team_activity' | 'club_activity' | 'campus_status' | 'find_people' | 'find_recruitment' }) {
  const guides = {
    create_project: ['프로젝트실', '프로젝트 생성과 팀 작업은 프로젝트실에서 진행합니다.'],
    team_activity: ['프로젝트실', '승인된 팀의 활동은 프로젝트실에서 이어집니다.'],
    club_activity: ['동아리관', '동아리 가입과 활동은 동아리관에서 진행합니다.'],
    campus_status: ['학생회관', '캠퍼스 공지와 전체 현황은 학생회관에서 확인합니다.'],
    find_people: ['모집센터', '공개 프로필을 바탕으로 함께할 사람을 찾을 수 있습니다.'],
    find_recruitment: ['모집센터', '현재 모집 중인 활동을 찾아보고 프로필을 전달할 수 있습니다.'],
  } as const;
  const [destination, reason] = guides[input.purpose];
  return { destination, reason, travelAction: destination === '프로젝트실' ? 'project-room' : null };
}

function approximateArea(mapId: string) {
  const areas: Record<string, string> = {
    'recruitment-center': '모집센터', 'project-room': '프로젝트실', 'student-hall': '학생회관', campus: '공동캠퍼스', garden: '수목원', town: '캠퍼스 광장',
  };
  return areas[mapId] ?? '캠퍼스 내';
}
