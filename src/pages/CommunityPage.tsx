import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent
} from 'react';
import type { UserProfile } from '../types';
import './CommunityPage.css';

type CommunityPageProps = {
  profile: UserProfile;
  onBack: () => void;
};

type CommunityTab = 'board' | 'clubs';

type CommunityComment = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

type CommunityPost = {
  id: string;
  author: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  likedBy: string[];
  comments: CommunityComment[];
  createdAt: string;
};

type ClubMember = {
  userId: string;
  name: string;
  joinedAt: string;
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
  createdAt: string;
};

type ApiErrorBody = {
  message?: string;
  error?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:3001';

const BOARD_CATEGORIES = [
  '자유게시판',
  '정보게시판',
  '질문게시판',
  '분실물',
  '모임·행사'
];

const CLUB_CATEGORIES = [
  '운동',
  '게임',
  '음악',
  '스터디',
  '문화·예술',
  '친목',
  '봉사',
  '기타'
];

const CLUB_COLORS = [
  '#ff6b6b',
  '#ff922b',
  '#fcc419',
  '#51cf66',
  '#22b8cf',
  '#4c6ef5',
  '#7950f2',
  '#e64980'
];

function createStableUserId(nickname: string): string {
  const normalizedNickname = nickname.trim() || 'anonymous';

  return `community-user-${normalizedNickname
    .toLowerCase()
    .replace(/\s+/g, '-')}`;
}

function formatDate(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const difference = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) {
    return '방금 전';
  }

  if (difference < hour) {
    return `${Math.floor(difference / minute)}분 전`;
  }

  if (difference < day) {
    return `${Math.floor(difference / hour)}시간 전`;
  }

  if (difference < day * 7) {
    return `${Math.floor(difference / day)}일 전`;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;

    return (
      body.message ??
      body.error ??
      '요청을 처리하지 못했습니다.'
    );
  } catch {
    return '요청을 처리하지 못했습니다.';
  }
}

export function CommunityPage({
  profile,
  onBack
}: CommunityPageProps) {
  const userName = profile.nickname.trim() || '익명';

  const userId = useMemo(
    () => createStableUserId(userName),
    [userName]
  );

  const [activeTab, setActiveTab] =
    useState<CommunityTab>('board');

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingClubs, setLoadingClubs] = useState(true);

  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  const [postCategory, setPostCategory] = useState(
    BOARD_CATEGORIES[0]
  );

  const [showPostComposer, setShowPostComposer] =
    useState(false);

  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');

  const [clubCategory, setClubCategory] = useState(
    CLUB_CATEGORIES[0]
  );

  const [clubColor, setClubColor] = useState(
    CLUB_COLORS[0]
  );

  const [showClubComposer, setShowClubComposer] =
    useState(false);

  const [commentDrafts, setCommentDrafts] = useState<
    Record<string, string>
  >({});

  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({});

  const [selectedBoardCategory, setSelectedBoardCategory] =
    useState('전체');

  const [selectedClubCategory, setSelectedClubCategory] =
    useState('전체');

  const [searchText, setSearchText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [workingKey, setWorkingKey] = useState('');

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/community`
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data =
        (await response.json()) as CommunityPost[];

      setPosts(
        Array.isArray(data)
          ? data.map((post) => ({
              ...post,
              likedBy: Array.isArray(post.likedBy)
                ? post.likedBy
                : [],
              comments: Array.isArray(post.comments)
                ? post.comments
                : [],
              likes:
                typeof post.likes === 'number'
                  ? post.likes
                  : 0
            }))
          : []
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '게시글을 불러오지 못했습니다.'
      );
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const loadClubs = useCallback(async () => {
    setLoadingClubs(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/clubs`
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as Club[];

      setClubs(
        Array.isArray(data)
          ? data.map((club) => ({
              ...club,
              members: Array.isArray(club.members)
                ? club.members
                : []
            }))
          : []
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '동아리 목록을 불러오지 못했습니다.'
      );
    } finally {
      setLoadingClubs(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadPosts(), loadClubs()]);
  }, [loadClubs, loadPosts]);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

    return posts.filter((post) => {
      const categoryMatches =
        selectedBoardCategory === '전체' ||
        post.category === selectedBoardCategory;

      const searchMatches =
        normalizedSearch.length === 0 ||
        post.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        post.content
          .toLowerCase()
          .includes(normalizedSearch) ||
        post.author
          .toLowerCase()
          .includes(normalizedSearch);

      return categoryMatches && searchMatches;
    });
  }, [posts, searchText, selectedBoardCategory]);

  const filteredClubs = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

    return clubs.filter((club) => {
      const categoryMatches =
        selectedClubCategory === '전체' ||
        club.category === selectedClubCategory;

      const searchMatches =
        normalizedSearch.length === 0 ||
        club.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        club.description
          .toLowerCase()
          .includes(normalizedSearch) ||
        club.ownerName
          .toLowerCase()
          .includes(normalizedSearch);

      return categoryMatches && searchMatches;
    });
  }, [clubs, searchText, selectedClubCategory]);

  const joinedClubCount = useMemo(
    () =>
      clubs.filter((club) =>
        club.members.some(
          (member) => member.userId === userId
        )
      ).length,
    [clubs, userId]
  );

  const handleCreatePost = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!postTitle.trim() || !postContent.trim()) {
      setErrorMessage(
        '제목과 내용을 모두 입력해주세요.'
      );
      return;
    }

    setWorkingKey('create-post');
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/community`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            author: userName,
            title: postTitle,
            content: postContent,
            category: postCategory
          })
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const createdPost =
        (await response.json()) as CommunityPost;

      setPosts((currentPosts) => [
        createdPost,
        ...currentPosts
      ]);

      setPostTitle('');
      setPostContent('');
      setPostCategory(BOARD_CATEGORIES[0]);
      setShowPostComposer(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '게시글을 작성하지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm(
      '이 게시글을 삭제할까요?'
    );

    if (!confirmed) {
      return;
    }

    setWorkingKey(`delete-post-${postId}`);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/community/${postId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setPosts((currentPosts) =>
        currentPosts.filter(
          (post) => post.id !== postId
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '게시글을 삭제하지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const handleToggleLike = async (postId: string) => {
    setWorkingKey(`like-${postId}`);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/community/${postId}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId
          })
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const result = (await response.json()) as {
        likes: number;
        liked: boolean;
        likedBy: string[];
      };

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: result.likes,
                likedBy: result.likedBy
              }
            : post
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '좋아요를 처리하지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const handleCreateComment = async (
    event: FormEvent<HTMLFormElement>,
    postId: string
  ) => {
    event.preventDefault();

    const content = commentDrafts[postId]?.trim();

    if (!content) {
      return;
    }

    setWorkingKey(`comment-${postId}`);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/community/${postId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            author: userName,
            content
          })
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const createdComment =
        (await response.json()) as CommunityComment;

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [
                  ...post.comments,
                  createdComment
                ]
              }
            : post
        )
      );

      setCommentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [postId]: ''
      }));

      setExpandedComments((currentExpanded) => ({
        ...currentExpanded,
        [postId]: true
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '댓글을 작성하지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const handleDeleteComment = async (
    postId: string,
    commentId: string
  ) => {
    setWorkingKey(`delete-comment-${commentId}`);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/community/${postId}/comments/${commentId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.filter(
                  (comment) =>
                    comment.id !== commentId
                )
              }
            : post
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '댓글을 삭제하지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const handleCreateClub = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!clubName.trim()) {
      setErrorMessage('동아리 이름을 입력해주세요.');
      return;
    }

    setWorkingKey('create-club');
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/clubs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: clubName,
            description: clubDescription,
            category: clubCategory,
            color: clubColor,
            ownerId: userId,
            ownerName: userName
          })
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const createdClub =
        (await response.json()) as Club;

      setClubs((currentClubs) => [
        createdClub,
        ...currentClubs
      ]);

      setClubName('');
      setClubDescription('');
      setClubCategory(CLUB_CATEGORIES[0]);
      setClubColor(CLUB_COLORS[0]);
      setShowClubComposer(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '동아리를 만들지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const handleJoinClub = async (clubId: string) => {
    setWorkingKey(`join-${clubId}`);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/clubs/${clubId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            userName
          })
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const updatedClub =
        (await response.json()) as Club;

      setClubs((currentClubs) =>
        currentClubs.map((club) =>
          club.id === clubId ? updatedClub : club
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '동아리에 가입하지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const handleLeaveClub = async (clubId: string) => {
    const confirmed = window.confirm(
      '이 동아리에서 탈퇴할까요?'
    );

    if (!confirmed) {
      return;
    }

    setWorkingKey(`leave-${clubId}`);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/clubs/${clubId}/leave`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId
          })
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const updatedClub =
        (await response.json()) as Club;

      setClubs((currentClubs) =>
        currentClubs.map((club) =>
          club.id === clubId ? updatedClub : club
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '동아리에서 탈퇴하지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    const confirmed = window.confirm(
      '동아리를 완전히 삭제할까요?'
    );

    if (!confirmed) {
      return;
    }

    setWorkingKey(`delete-club-${clubId}`);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/clubs/${clubId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ownerId: userId
          })
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setClubs((currentClubs) =>
        currentClubs.filter(
          (club) => club.id !== clubId
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '동아리를 삭제하지 못했습니다.'
      );
    } finally {
      setWorkingKey('');
    }
  };

  const switchTab = (tab: CommunityTab) => {
    setActiveTab(tab);
    setSearchText('');
    setErrorMessage('');
  };

  return (
    <main className="community-page">
      <div className="community-background community-background-one" />
      <div className="community-background community-background-two" />

      <section className="community-shell">
        <header className="community-header">
          <button
            type="button"
            className="community-back-button"
            onClick={onBack}
            aria-label="공동캠퍼스로 돌아가기"
          >
            <span aria-hidden="true">←</span>
            공동캠퍼스로 돌아가기
          </button>

          <div className="community-title-group">
            <span className="community-eyebrow">
              공동캠퍼스
            </span>

            <h1>함께 이야기하고 모여봐요</h1>

            <p>
              접속을 종료해도 게시글과 동아리는 그대로
              유지됩니다.
            </p>
          </div>

          <div className="community-profile-card">
            <div className="community-profile-avatar">
              {userName.slice(0, 1)}
            </div>

            <div>
              <strong>{userName}</strong>
              <span>
                가입 동아리 {joinedClubCount}개
              </span>
            </div>
          </div>
        </header>

        <div className="community-toolbar">
          <nav
            className="community-tabs"
            aria-label="공동캠퍼스 메뉴"
          >
            <button
              type="button"
              className={
                activeTab === 'board' ? 'active' : ''
              }
              onClick={() => switchTab('board')}
            >
              <span aria-hidden="true">💬</span>
              커뮤니티
              <b>{posts.length}</b>
            </button>

            <button
              type="button"
              className={
                activeTab === 'clubs' ? 'active' : ''
              }
              onClick={() => switchTab('clubs')}
            >
              <span aria-hidden="true">🎪</span>
              동아리
              <b>{clubs.length}</b>
            </button>
          </nav>

          <label className="community-search">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder={
                activeTab === 'board'
                  ? '게시글 검색'
                  : '동아리 검색'
              }
            />
          </label>
        </div>

        {errorMessage && (
          <div
            className="community-error"
            role="alert"
          >
            <span>{errorMessage}</span>

            <button
              type="button"
              onClick={() => setErrorMessage('')}
              aria-label="오류 메시지 닫기"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === 'board' ? (
          <section className="community-content">
            <div className="community-section-heading">
              <div>
                <h2>캠퍼스 게시판</h2>

                <p>
                  모두에게 필요한 이야기와 정보를
                  자유롭게 나눠보세요.
                </p>
              </div>

              <button
                type="button"
                className="community-primary-button"
                onClick={() =>
                  setShowPostComposer(
                    (current) => !current
                  )
                }
              >
                {showPostComposer
                  ? '작성 취소'
                  : '+ 새 글 작성'}
              </button>
            </div>

            {showPostComposer && (
              <form
                className="community-composer"
                onSubmit={handleCreatePost}
              >
                <div className="community-composer-top">
                  <label>
                    게시판

                    <select
                      value={postCategory}
                      onChange={(event) =>
                        setPostCategory(
                          event.target.value
                        )
                      }
                    >
                      {BOARD_CATEGORIES.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <span>{userName}으로 작성</span>
                </div>

                <input
                  className="community-title-input"
                  value={postTitle}
                  onChange={(event) =>
                    setPostTitle(event.target.value)
                  }
                  placeholder="제목을 입력해주세요"
                  maxLength={80}
                />

                <textarea
                  value={postContent}
                  onChange={(event) =>
                    setPostContent(event.target.value)
                  }
                  placeholder="캠퍼스 친구들과 나누고 싶은 내용을 작성해주세요."
                  rows={6}
                  maxLength={1500}
                />

                <div className="community-composer-bottom">
                  <span>
                    {postContent.length.toLocaleString()} /
                    1,500
                  </span>

                  <button
                    type="submit"
                    className="community-primary-button"
                    disabled={
                      workingKey === 'create-post'
                    }
                  >
                    {workingKey === 'create-post'
                      ? '등록 중...'
                      : '게시하기'}
                  </button>
                </div>
              </form>
            )}

            <div className="community-filter-row">
              {['전체', ...BOARD_CATEGORIES].map(
                (category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      selectedBoardCategory === category
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setSelectedBoardCategory(category)
                    }
                  >
                    {category}
                  </button>
                )
              )}
            </div>

            {loadingPosts ? (
              <div className="community-empty-state">
                <div className="community-spinner" />
                <strong>게시글을 불러오는 중</strong>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="community-empty-state">
                <span aria-hidden="true">📝</span>
                <strong>아직 게시글이 없습니다</strong>

                <p>
                  가장 먼저 캠퍼스 이야기를
                  남겨보세요.
                </p>
              </div>
            ) : (
              <div className="community-post-list">
                {filteredPosts.map((post) => {
                  const liked =
                    post.likedBy.includes(userId);

                  const commentsVisible =
                    expandedComments[post.id] ?? false;

                  return (
                    <article
                      key={post.id}
                      className="community-post-card"
                    >
                      <div className="community-post-header">
                        <div className="community-author">
                          <div className="community-author-avatar">
                            {post.author.slice(0, 1)}
                          </div>

                          <div>
                            <strong>{post.author}</strong>

                            <span>
                              {formatDate(
                                post.createdAt
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="community-post-header-actions">
                          <span className="community-category-badge">
                            {post.category}
                          </span>

                          {post.author === userName && (
                            <button
                              type="button"
                              className="community-icon-button danger"
                              onClick={() =>
                                void handleDeletePost(
                                  post.id
                                )
                              }
                              disabled={
                                workingKey ===
                                `delete-post-${post.id}`
                              }
                              aria-label="게시글 삭제"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="community-post-body">
                        <h3>{post.title}</h3>
                        <p>{post.content}</p>
                      </div>

                      <div className="community-post-actions">
                        <button
                          type="button"
                          className={
                            liked ? 'liked' : ''
                          }
                          onClick={() =>
                            void handleToggleLike(
                              post.id
                            )
                          }
                          disabled={
                            workingKey ===
                            `like-${post.id}`
                          }
                        >
                          <span aria-hidden="true">
                            {liked ? '♥' : '♡'}
                          </span>

                          좋아요 {post.likes}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments(
                              (currentExpanded) => ({
                                ...currentExpanded,
                                [post.id]:
                                  !currentExpanded[
                                    post.id
                                  ]
                              })
                            )
                          }
                        >
                          <span aria-hidden="true">
                            💬
                          </span>

                          댓글 {post.comments.length}
                        </button>
                      </div>

                      {commentsVisible && (
                        <div className="community-comments">
                          {post.comments.length > 0 && (
                            <div className="community-comment-list">
                              {post.comments.map(
                                (comment) => (
                                  <div
                                    key={comment.id}
                                    className="community-comment"
                                  >
                                    <div className="community-comment-avatar">
                                      {comment.author.slice(
                                        0,
                                        1
                                      )}
                                    </div>

                                    <div className="community-comment-content">
                                      <div>
                                        <strong>
                                          {comment.author}
                                        </strong>

                                        <span>
                                          {formatDate(
                                            comment.createdAt
                                          )}
                                        </span>
                                      </div>

                                      <p>
                                        {comment.content}
                                      </p>
                                    </div>

                                    {comment.author ===
                                      userName && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleDeleteComment(
                                            post.id,
                                            comment.id
                                          )
                                        }
                                        disabled={
                                          workingKey ===
                                          `delete-comment-${comment.id}`
                                        }
                                        aria-label="댓글 삭제"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          <form
                            className="community-comment-form"
                            onSubmit={(event) =>
                              void handleCreateComment(
                                event,
                                post.id
                              )
                            }
                          >
                            <div className="community-comment-avatar">
                              {userName.slice(0, 1)}
                            </div>

                            <input
                              value={
                                commentDrafts[
                                  post.id
                                ] ?? ''
                              }
                              onChange={(event) =>
                                setCommentDrafts(
                                  (currentDrafts) => ({
                                    ...currentDrafts,
                                    [post.id]:
                                      event.target.value
                                  })
                                )
                              }
                              placeholder="댓글을 입력해주세요"
                              maxLength={300}
                            />

                            <button
                              type="submit"
                              disabled={
                                !commentDrafts[
                                  post.id
                                ]?.trim() ||
                                workingKey ===
                                  `comment-${post.id}`
                              }
                            >
                              등록
                            </button>
                          </form>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="community-content">
            <div className="community-section-heading">
              <div>
                <h2>캠퍼스 동아리</h2>

                <p>
                  관심사가 맞는 친구들과 오래 유지되는
                  모임을 만들어보세요.
                </p>
              </div>

              <button
                type="button"
                className="community-primary-button"
                onClick={() =>
                  setShowClubComposer(
                    (current) => !current
                  )
                }
              >
                {showClubComposer
                  ? '만들기 취소'
                  : '+ 동아리 만들기'}
              </button>
            </div>

            <div className="community-club-summary">
              <div>
                <span aria-hidden="true">🎪</span>
                <strong>{clubs.length}</strong>
                <p>활동 중인 동아리</p>
              </div>

              <div>
                <span aria-hidden="true">🙌</span>
                <strong>{joinedClubCount}</strong>
                <p>내가 가입한 동아리</p>
              </div>

              <div>
                <span aria-hidden="true">💾</span>
                <strong>영구 저장</strong>
                <p>접속 종료 후에도 유지</p>
              </div>
            </div>

            {showClubComposer && (
              <form
                className="community-composer club-composer"
                onSubmit={handleCreateClub}
              >
                <div className="community-composer-top">
                  <label>
                    분야

                    <select
                      value={clubCategory}
                      onChange={(event) =>
                        setClubCategory(
                          event.target.value
                        )
                      }
                    >
                      {CLUB_CATEGORIES.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <span>
                    {userName}님이 동아리장이 됩니다.
                  </span>
                </div>

                <input
                  className="community-title-input"
                  value={clubName}
                  onChange={(event) =>
                    setClubName(event.target.value)
                  }
                  placeholder="동아리 이름"
                  maxLength={40}
                />

                <textarea
                  value={clubDescription}
                  onChange={(event) =>
                    setClubDescription(
                      event.target.value
                    )
                  }
                  placeholder="어떤 활동을 하는 동아리인지 소개해주세요."
                  rows={5}
                  maxLength={500}
                />

                <div className="community-color-picker">
                  <span>대표 색상</span>

                  <div>
                    {CLUB_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={
                          clubColor === color
                            ? 'active'
                            : ''
                        }
                        style={{
                          backgroundColor: color
                        }}
                        onClick={() =>
                          setClubColor(color)
                        }
                        aria-label={`${color} 색상 선택`}
                      />
                    ))}
                  </div>
                </div>

                <div className="community-composer-bottom">
                  <span>
                    동아리는 직접 탈퇴하거나 삭제하기
                    전까지 유지됩니다.
                  </span>

                  <button
                    type="submit"
                    className="community-primary-button"
                    disabled={
                      workingKey === 'create-club'
                    }
                  >
                    {workingKey === 'create-club'
                      ? '생성 중...'
                      : '동아리 만들기'}
                  </button>
                </div>
              </form>
            )}

            <div className="community-filter-row">
              {['전체', ...CLUB_CATEGORIES].map(
                (category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      selectedClubCategory === category
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setSelectedClubCategory(category)
                    }
                  >
                    {category}
                  </button>
                )
              )}
            </div>

            {loadingClubs ? (
              <div className="community-empty-state">
                <div className="community-spinner" />
                <strong>동아리를 불러오는 중</strong>
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="community-empty-state">
                <span aria-hidden="true">🎪</span>
                <strong>아직 동아리가 없습니다</strong>

                <p>
                  첫 번째 캠퍼스 동아리를
                  만들어보세요.
                </p>
              </div>
            ) : (
              <div className="community-club-grid">
                {filteredClubs.map((club) => {
                  const joined = club.members.some(
                    (member) =>
                      member.userId === userId
                  );

                  const isOwner =
                    club.ownerId === userId;

                  const clubCardStyle = {
                    '--club-color': club.color
                  } as CSSProperties;

                  return (
                    <article
                      key={club.id}
                      className="community-club-card"
                      style={clubCardStyle}
                    >
                      <div className="community-club-banner">
                        <span>{club.category}</span>

                        <div className="community-club-symbol">
                          {club.name.slice(0, 1)}
                        </div>

                        {joined && (
                          <b>
                            {isOwner
                              ? '동아리장'
                              : '가입 중'}
                          </b>
                        )}
                      </div>

                      <div className="community-club-body">
                        <div className="community-club-title">
                          <div>
                            <h3>{club.name}</h3>

                            <span>
                              동아리장 {club.ownerName}
                            </span>
                          </div>

                          {isOwner && (
                            <button
                              type="button"
                              className="community-icon-button danger"
                              onClick={() =>
                                void handleDeleteClub(
                                  club.id
                                )
                              }
                              disabled={
                                workingKey ===
                                `delete-club-${club.id}`
                              }
                              aria-label="동아리 삭제"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        <p className="community-club-description">
                          {club.description ||
                            '아직 동아리 소개가 없습니다.'}
                        </p>

                        <div className="community-club-members">
                          <div className="community-member-avatars">
                            {club.members
                              .slice(0, 4)
                              .map((member) => (
                                <span
                                  key={member.userId}
                                  title={member.name}
                                >
                                  {member.name.slice(
                                    0,
                                    1
                                  )}
                                </span>
                              ))}

                            {club.members.length > 4 && (
                              <span>
                                +
                                {club.members.length -
                                  4}
                              </span>
                            )}
                          </div>

                          <strong>
                            멤버 {club.members.length}명
                          </strong>
                        </div>

                        {joined ? (
                          <button
                            type="button"
                            className="community-club-action joined"
                            onClick={() =>
                              void handleLeaveClub(
                                club.id
                              )
                            }
                            disabled={
                              workingKey ===
                              `leave-${club.id}`
                            }
                          >
                            {workingKey ===
                            `leave-${club.id}`
                              ? '처리 중...'
                              : isOwner
                                ? '동아리장 · 탈퇴하기'
                                : '가입 중 · 탈퇴하기'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="community-club-action"
                            onClick={() =>
                              void handleJoinClub(
                                club.id
                              )
                            }
                            disabled={
                              workingKey ===
                              `join-${club.id}`
                            }
                          >
                            {workingKey ===
                            `join-${club.id}`
                              ? '가입 중...'
                              : '동아리 가입하기'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
