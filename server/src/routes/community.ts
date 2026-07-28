import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

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

const router = Router();

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const dataFilePath = path.join(
  currentDirectory,
  '../data/community-posts.json',
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

async function readPosts(): Promise<CommunityPost[]> {
  await ensureDataFile();

  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const parsedData = JSON.parse(fileContent);

    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error('[Community] 게시글 파일 읽기 실패:', error);
    return [];
  }
}

async function savePosts(posts: CommunityPost[]): Promise<void> {
  await ensureDataFile();

  await fs.writeFile(
    dataFilePath,
    JSON.stringify(posts, null, 2),
    'utf-8',
  );
}

router.get('/', async (_request, response) => {
  try {
    const posts = await readPosts();

    const sortedPosts = [...posts].sort(
      (firstPost, secondPost) =>
        new Date(secondPost.createdAt).getTime() -
        new Date(firstPost.createdAt).getTime(),
    );

    response.json(sortedPosts);
  } catch (error) {
    console.error('[Community] 게시글 조회 실패:', error);

    response.status(500).json({
      message: '게시글을 불러오지 못했습니다.',
    });
  }
});

router.post('/', async (request, response) => {
  try {
    const {
      author,
      title,
      content,
      category,
    } = request.body as {
      author?: string;
      title?: string;
      content?: string;
      category?: string;
    };

    if (!title?.trim() || !content?.trim()) {
      response.status(400).json({
        message: '제목과 내용을 입력해주세요.',
      });

      return;
    }

    const posts = await readPosts();

    const newPost: CommunityPost = {
      id: randomUUID(),
      author: author?.trim() || '익명',
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || '자유게시판',
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    posts.push(newPost);
    await savePosts(posts);

    response.status(201).json(newPost);
  } catch (error) {
    console.error('[Community] 게시글 작성 실패:', error);

    response.status(500).json({
      message: '게시글을 작성하지 못했습니다.',
    });
  }
});

router.delete('/:postId', async (request, response) => {
  try {
    const { postId } = request.params;
    const posts = await readPosts();

    const postIndex = posts.findIndex(
      (post) => post.id === postId,
    );

    if (postIndex === -1) {
      response.status(404).json({
        message: '게시글을 찾을 수 없습니다.',
      });

      return;
    }

    posts.splice(postIndex, 1);
    await savePosts(posts);

    response.json({
      message: '게시글이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('[Community] 게시글 삭제 실패:', error);

    response.status(500).json({
      message: '게시글을 삭제하지 못했습니다.',
    });
  }
});

router.post('/:postId/like', async (request, response) => {
  try {
    const { postId } = request.params;
    const { userId } = request.body as {
      userId?: string;
    };

    const currentUserId = userId?.trim() || 'anonymous-user';
    const posts = await readPosts();

    const post = posts.find(
      (currentPost) => currentPost.id === postId,
    );

    if (!post) {
      response.status(404).json({
        message: '게시글을 찾을 수 없습니다.',
      });

      return;
    }

    if (!Array.isArray(post.likedBy)) {
      post.likedBy = [];
    }

    const alreadyLiked = post.likedBy.includes(currentUserId);

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter(
        (likedUserId) => likedUserId !== currentUserId,
      );
    } else {
      post.likedBy.push(currentUserId);
    }

    post.likes = post.likedBy.length;

    await savePosts(posts);

    response.json({
      postId: post.id,
      likes: post.likes,
      liked: !alreadyLiked,
      likedBy: post.likedBy,
    });
  } catch (error) {
    console.error('[Community] 좋아요 처리 실패:', error);

    response.status(500).json({
      message: '좋아요를 처리하지 못했습니다.',
    });
  }
});

router.post('/:postId/comments', async (request, response) => {
  try {
    const { postId } = request.params;

    const {
      author,
      content,
    } = request.body as {
      author?: string;
      content?: string;
    };

    if (!content?.trim()) {
      response.status(400).json({
        message: '댓글 내용을 입력해주세요.',
      });

      return;
    }

    const posts = await readPosts();

    const post = posts.find(
      (currentPost) => currentPost.id === postId,
    );

    if (!post) {
      response.status(404).json({
        message: '게시글을 찾을 수 없습니다.',
      });

      return;
    }

    if (!Array.isArray(post.comments)) {
      post.comments = [];
    }

    const newComment: CommunityComment = {
      id: randomUUID(),
      author: author?.trim() || '익명',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    post.comments.push(newComment);
    await savePosts(posts);

    response.status(201).json(newComment);
  } catch (error) {
    console.error('[Community] 댓글 작성 실패:', error);

    response.status(500).json({
      message: '댓글을 작성하지 못했습니다.',
    });
  }
});

router.delete(
  '/:postId/comments/:commentId',
  async (request, response) => {
    try {
      const {
        postId,
        commentId,
      } = request.params;

      const posts = await readPosts();

      const post = posts.find(
        (currentPost) => currentPost.id === postId,
      );

      if (!post) {
        response.status(404).json({
          message: '게시글을 찾을 수 없습니다.',
        });

        return;
      }

      const originalCommentCount = post.comments.length;

      post.comments = post.comments.filter(
        (comment) => comment.id !== commentId,
      );

      if (post.comments.length === originalCommentCount) {
        response.status(404).json({
          message: '댓글을 찾을 수 없습니다.',
        });

        return;
      }

      await savePosts(posts);

      response.json({
        message: '댓글이 삭제되었습니다.',
      });
    } catch (error) {
      console.error('[Community] 댓글 삭제 실패:', error);

      response.status(500).json({
        message: '댓글을 삭제하지 못했습니다.',
      });
    }
  },
);

export const communityRouter = router;