import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

type ClubMember = {
  userId: string;
  name: string;
  joinedAt: string;
};

type ActivityVoter = {
  userId: string;
  name: string;
};

type ClubActivityBoard = {
  placeVotes: Array<{ option: string; voters: ActivityVoter[] }>;
  topicVotes: Array<{ option: string; voters: ActivityVoter[] }>;
  themeIdeas: Array<{ id: string; author: string; text: string; createdAt: string }>;
  placeCards: Array<{ id: string; author: string; name: string; reason: string; createdAt: string }>;
  introCopies: Array<{ id: string; author: string; text: string; createdAt: string }>;
};

type Club = {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  ownerId: string;
  ownerName: string;
  members: ClubMember[];
  activity?: string;
  location?: string;
  schedule?: string;
  capacity?: number;
  tags?: string[];
  activityBoard?: ClubActivityBoard;
  createdAt: string;
};

const router = Router();

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const dataFilePath = path.join(
  currentDirectory,
  '../data/clubs.json',
);

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(dataFilePath);
  } catch {
    await fs.mkdir(path.dirname(dataFilePath), {
      recursive: true,
    });

    await fs.writeFile(dataFilePath, '[]', 'utf-8');
  }
}

async function readClubs(): Promise<Club[]> {
  await ensureDataFile();

  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const parsedData = JSON.parse(fileContent);

    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error('[Clubs] 동아리 파일 읽기 실패:', error);
    return [];
  }
}

async function saveClubs(clubs: Club[]): Promise<void> {
  await ensureDataFile();

  await fs.writeFile(
    dataFilePath,
    JSON.stringify(clubs, null, 2),
    'utf-8',
  );
}

const placeVoteOptions = ['국립세종수목원', '세종호수공원', '이응다리', '조치원전통시장'];
const topicVoteOptions = ['야간축제', '식물사진', '카페투어', '스마트도시 탐방'];
const ensureActivityBoard = (club: Club): ClubActivityBoard => {
  if (!club.activityBoard) {
    club.activityBoard = {
      placeVotes: placeVoteOptions.map((option) => ({ option, voters: [] })),
      topicVotes: topicVoteOptions.map((option) => ({ option, voters: [] })),
      themeIdeas: [],
      placeCards: [],
      introCopies: [],
    };
  }
  return club.activityBoard;
};

router.get('/', async (_request, response) => {
  try {
    const clubs = await readClubs();

    const sortedClubs = [...clubs].sort(
      (firstClub, secondClub) =>
        new Date(secondClub.createdAt).getTime() -
        new Date(firstClub.createdAt).getTime(),
    );

    response.json(sortedClubs);
  } catch (error) {
    console.error('[Clubs] 동아리 조회 실패:', error);

    response.status(500).json({
      message: '동아리 목록을 불러오지 못했습니다.',
    });
  }
});

router.post('/', async (request, response) => {
  try {
    const {
      name,
      description,
      category,
      color,
      ownerId,
      ownerName,
      activity,
      location,
      schedule,
      capacity,
      tags,
    } = request.body as {
      name?: string;
      description?: string;
      category?: string;
      color?: string;
      ownerId?: string;
      ownerName?: string;
      activity?: string;
      location?: string;
      schedule?: string;
      capacity?: number;
      tags?: string[];
    };

    if (!name?.trim()) {
      response.status(400).json({
        message: '동아리 이름을 입력해주세요.',
      });

      return;
    }

    const clubs = await readClubs();

    const normalizedName = name.trim().toLowerCase();

    const duplicatedClub = clubs.some(
      (club) => club.name.trim().toLowerCase() === normalizedName,
    );

    if (duplicatedClub) {
      response.status(409).json({
        message: '같은 이름의 동아리가 이미 존재합니다.',
      });

      return;
    }

    const creatorId = ownerId?.trim() || 'anonymous-user';
    const creatorName = ownerName?.trim() || '익명';

    const newClub: Club = {
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() || '',
      category: category?.trim() || '기타',
      color: color?.trim() || '#6c5ce7',
      ownerId: creatorId,
      ownerName: creatorName,
      activity: activity?.trim() || '',
      location: location?.trim() || '세종 공동캠퍼스',
      schedule: schedule?.trim() || '일정 협의',
      capacity: Number.isFinite(capacity) ? Math.max(2, Math.min(Number(capacity), 100)) : 12,
      tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 8) : [],
      activityBoard: {
        placeVotes: placeVoteOptions.map((option) => ({ option, voters: [] })),
        topicVotes: topicVoteOptions.map((option) => ({ option, voters: [] })),
        themeIdeas: [],
        placeCards: [],
        introCopies: [],
      },
      members: [
        {
          userId: creatorId,
          name: creatorName,
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    clubs.push(newClub);
    await saveClubs(clubs);

    response.status(201).json(newClub);
  } catch (error) {
    console.error('[Clubs] 동아리 생성 실패:', error);

    response.status(500).json({
      message: '동아리를 생성하지 못했습니다.',
    });
  }
});

router.post('/:clubId/join', async (request, response) => {
  try {
    const { clubId } = request.params;

    const {
      userId,
      userName,
    } = request.body as {
      userId?: string;
      userName?: string;
    };

    const currentUserId = userId?.trim() || 'anonymous-user';
    const currentUserName = userName?.trim() || '익명';

    const clubs = await readClubs();

    const club = clubs.find(
      (currentClub) => currentClub.id === clubId,
    );

    if (!club) {
      response.status(404).json({
        message: '동아리를 찾을 수 없습니다.',
      });

      return;
    }

    if (!Array.isArray(club.members)) {
      club.members = [];
    }

    const alreadyJoined = club.members.some(
      (member) => member.userId === currentUserId,
    );

    if (alreadyJoined) {
      response.status(409).json({
        message: '이미 가입한 동아리입니다.',
      });

      return;
    }

    club.members.push({
      userId: currentUserId,
      name: currentUserName,
      joinedAt: new Date().toISOString(),
    });

    await saveClubs(clubs);

    response.json(club);
  } catch (error) {
    console.error('[Clubs] 동아리 가입 실패:', error);

    response.status(500).json({
      message: '동아리에 가입하지 못했습니다.',
    });
  }
});

router.post('/:clubId/leave', async (request, response) => {
  try {
    const { clubId } = request.params;

    const { userId } = request.body as {
      userId?: string;
    };

    const currentUserId = userId?.trim() || 'anonymous-user';

    const clubs = await readClubs();

    const club = clubs.find(
      (currentClub) => currentClub.id === clubId,
    );

    if (!club) {
      response.status(404).json({
        message: '동아리를 찾을 수 없습니다.',
      });

      return;
    }

    if (!Array.isArray(club.members)) {
      club.members = [];
    }

    const originalMemberCount = club.members.length;

    club.members = club.members.filter(
      (member) => member.userId !== currentUserId,
    );

    if (club.members.length === originalMemberCount) {
      response.status(404).json({
        message: '가입 중인 동아리가 아닙니다.',
      });

      return;
    }

    await saveClubs(clubs);

    response.json(club);
  } catch (error) {
    console.error('[Clubs] 동아리 탈퇴 실패:', error);

    response.status(500).json({
      message: '동아리에서 탈퇴하지 못했습니다.',
    });
  }
});

router.put('/:clubId/activity-vote', async (request, response) => {
  try {
    const { clubId } = request.params;
    const { kind, option, userId, userName } = request.body as {
      kind?: 'place' | 'topic';
      option?: string;
      userId?: string;
      userName?: string;
    };
    if ((kind !== 'place' && kind !== 'topic') || !option?.trim() || !userId?.trim()) {
      response.status(400).json({ message: '투표 항목을 확인해 주세요.' });
      return;
    }
    const clubs = await readClubs();
    const club = clubs.find((item) => item.id === clubId);
    if (!club) {
      response.status(404).json({ message: '동아리를 찾을 수 없습니다.' });
      return;
    }
    const board = ensureActivityBoard(club);
    const votes = kind === 'place' ? board.placeVotes : board.topicVotes;
    const selected = votes.find((vote) => vote.option === option.trim());
    if (!selected) {
      response.status(400).json({ message: '선택할 수 없는 투표 항목입니다.' });
      return;
    }
    votes.forEach((vote) => {
      vote.voters = vote.voters.filter((voter) => voter.userId !== userId.trim());
    });
    selected.voters.push({ userId: userId.trim(), name: userName?.trim() || '익명' });
    await saveClubs(clubs);
    response.json(board);
  } catch (error) {
    console.error('[Clubs] 공동 활동 투표 실패:', error);
    response.status(500).json({ message: '투표를 저장하지 못했습니다.' });
  }
});

router.post('/:clubId/theme-ideas', async (request, response) => {
  try {
    const { clubId } = request.params;
    const { author, text } = request.body as { author?: string; text?: string };
    if (!text?.trim()) {
      response.status(400).json({ message: '축제 테마 아이디어를 입력해 주세요.' });
      return;
    }
    const clubs = await readClubs();
    const club = clubs.find((item) => item.id === clubId);
    if (!club) {
      response.status(404).json({ message: '동아리를 찾을 수 없습니다.' });
      return;
    }
    const board = ensureActivityBoard(club);
    board.themeIdeas.unshift({ id: randomUUID(), author: author?.trim() || '익명', text: text.trim().slice(0, 160), createdAt: new Date().toISOString() });
    await saveClubs(clubs);
    response.status(201).json(board);
  } catch (error) {
    console.error('[Clubs] 축제 테마 등록 실패:', error);
    response.status(500).json({ message: '축제 테마를 등록하지 못했습니다.' });
  }
});

router.post('/:clubId/place-cards', async (request, response) => {
  try {
    const { clubId } = request.params;
    const { author, name, reason } = request.body as { author?: string; name?: string; reason?: string };
    if (!name?.trim() || !reason?.trim()) {
      response.status(400).json({ message: '추천 장소와 추천 이유를 입력해 주세요.' });
      return;
    }
    const clubs = await readClubs();
    const club = clubs.find((item) => item.id === clubId);
    if (!club) {
      response.status(404).json({ message: '동아리를 찾을 수 없습니다.' });
      return;
    }
    const board = ensureActivityBoard(club);
    board.placeCards.unshift({ id: randomUUID(), author: author?.trim() || '익명', name: name.trim().slice(0, 80), reason: reason.trim().slice(0, 180), createdAt: new Date().toISOString() });
    await saveClubs(clubs);
    response.status(201).json(board);
  } catch (error) {
    console.error('[Clubs] 추천 장소 카드 등록 실패:', error);
    response.status(500).json({ message: '추천 장소 카드를 공유하지 못했습니다.' });
  }
});

router.post('/:clubId/intro-copies', async (request, response) => {
  try {
    const { clubId } = request.params;
    const { author, text } = request.body as { author?: string; text?: string };
    if (!text?.trim()) {
      response.status(400).json({ message: '동아리 소개 문구를 입력해 주세요.' });
      return;
    }
    const clubs = await readClubs();
    const club = clubs.find((item) => item.id === clubId);
    if (!club) {
      response.status(404).json({ message: '동아리를 찾을 수 없습니다.' });
      return;
    }
    const board = ensureActivityBoard(club);
    board.introCopies.unshift({ id: randomUUID(), author: author?.trim() || '익명', text: text.trim().slice(0, 220), createdAt: new Date().toISOString() });
    await saveClubs(clubs);
    response.status(201).json(board);
  } catch (error) {
    console.error('[Clubs] 소개 문구 등록 실패:', error);
    response.status(500).json({ message: '소개 문구를 공유하지 못했습니다.' });
  }
});

router.delete('/:clubId', async (request, response) => {
  try {
    const { clubId } = request.params;

    const { ownerId } = request.body as {
      ownerId?: string;
    };

    const clubs = await readClubs();

    const clubIndex = clubs.findIndex(
      (club) => club.id === clubId,
    );

    if (clubIndex === -1) {
      response.status(404).json({
        message: '동아리를 찾을 수 없습니다.',
      });

      return;
    }

    const club = clubs[clubIndex];

    if (
      ownerId?.trim() &&
      club.ownerId !== ownerId.trim()
    ) {
      response.status(403).json({
        message: '동아리장만 삭제할 수 있습니다.',
      });

      return;
    }

    clubs.splice(clubIndex, 1);
    await saveClubs(clubs);

    response.json({
      message: '동아리가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('[Clubs] 동아리 삭제 실패:', error);

    response.status(500).json({
      message: '동아리를 삭제하지 못했습니다.',
    });
  }
});

export const clubsRouter = router;
