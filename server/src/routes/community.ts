import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { CommunityPostModel } from '../models/CommunityPost.js';

const router = Router();

router.get('/', async (_request, response) => {
  try {
    const posts = await CommunityPostModel
      .find()
      .sort({ createdAt: -1 });

    response.json(posts);
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

    const newPost = await CommunityPostModel.create({
      id: randomUUID(),
      author: author?.trim() || '익명',
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || '자유게시판',
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date(),
    });

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

    const deletedPost = await CommunityPostModel.findOneAndDelete({
      id: postId,
    });

    if (!deletedPost) {
      response.status(404).json({
        message: '게시글을 찾을 수 없습니다.',
      });

      return;
    }

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

    const currentUserId =
      userId?.trim() || 'anonymous-user';

    const post = await CommunityPostModel.findOne({
      id: postId,
    });

    if (!post) {
      response.status(404).json({
        message: '게시글을 찾을 수 없습니다.',
      });

      return;
    }

    const alreadyLiked =
      post.likedBy.includes(currentUserId);

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter(
        (likedUserId) =>
          likedUserId !== currentUserId,
      );
    } else {
      post.likedBy.push(currentUserId);
    }

    post.likes = post.likedBy.length;

    await post.save();

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

router.post('/:postId/applications', async (request, response) => {
  try {
    const { postId } = request.params;
    const { userId, name, introduction, interests, travelStyle } = request.body as {
      userId?: string;
      name?: string;
      introduction?: string;
      interests?: string[];
      travelStyle?: string;
    };

    if (!userId?.trim() || !name?.trim() || !introduction?.trim()) {
      response.status(400).json({ message: '신청자 프로필과 소개를 확인해 주세요.' });
      return;
    }

    const post = await CommunityPostModel.findOne({ id: postId });
    if (!post) {
      response.status(404).json({ message: '모집글을 찾을 수 없습니다.' });
      return;
    }

    if (post.category !== '모임·행사') {
      response.status(400).json({ message: '모집글에만 참가 신청할 수 있습니다.' });
      return;
    }

    const existing = post.applications.find((application) => application.userId === userId.trim());
    if (existing) {
      response.status(409).json({ message: '이미 참가 신청을 보냈습니다.' });
      return;
    }

    const application = {
      id: randomUUID(),
      userId: userId.trim(),
      name: name.trim(),
      introduction: introduction.trim().slice(0, 160),
      interests: Array.isArray(interests) ? interests.filter((value) => typeof value === 'string').slice(0, 8) : [],
      travelStyle: travelStyle?.trim() || '여유롭게 둘러보기',
      status: 'pending' as const,
      createdAt: new Date(),
    };

    post.applications.push(application);
    await post.save();
    response.status(201).json(application);
  } catch (error) {
    console.error('[Community] 참가 신청 실패:', error);
    response.status(500).json({ message: '참가 신청을 보내지 못했습니다.' });
  }
});

router.patch('/:postId/applications/:applicationId', async (request, response) => {
  try {
    const { postId, applicationId } = request.params;
    const { author, status } = request.body as {
      author?: string;
      status?: 'accepted' | 'rejected';
    };

    if (status !== 'accepted' && status !== 'rejected') {
      response.status(400).json({ message: '수락 또는 거절 상태를 선택해 주세요.' });
      return;
    }

    const post = await CommunityPostModel.findOne({ id: postId });
    if (!post) {
      response.status(404).json({ message: '모집글을 찾을 수 없습니다.' });
      return;
    }

    if (post.author !== author?.trim()) {
      response.status(403).json({ message: '모집글 작성자만 신청을 처리할 수 있습니다.' });
      return;
    }

    const application = post.applications.find((item) => item.id === applicationId);
    if (!application) {
      response.status(404).json({ message: '참가 신청을 찾을 수 없습니다.' });
      return;
    }

    application.status = status;
    await post.save();
    response.json({
      application,
      groupChatReady: status === 'accepted',
      message: status === 'accepted' ? '참가를 수락하고 단체 채팅을 준비했습니다.' : '참가 신청을 거절했습니다.',
    });
  } catch (error) {
    console.error('[Community] 참가 신청 처리 실패:', error);
    response.status(500).json({ message: '참가 신청을 처리하지 못했습니다.' });
  }
});

router.post(
  '/:postId/comments',
  async (request, response) => {
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

      const post = await CommunityPostModel.findOne({
        id: postId,
      });

      if (!post) {
        response.status(404).json({
          message: '게시글을 찾을 수 없습니다.',
        });

        return;
      }

      const newComment = {
        id: randomUUID(),
        author: author?.trim() || '익명',
        content: content.trim(),
        createdAt: new Date(),
      };

      post.comments.push(newComment);

      await post.save();

      response.status(201).json(newComment);
    } catch (error) {
      console.error('[Community] 댓글 작성 실패:', error);

      response.status(500).json({
        message: '댓글을 작성하지 못했습니다.',
      });
    }
  },
);

router.delete(
  '/:postId/comments/:commentId',
  async (request, response) => {
    try {
      const {
        postId,
        commentId,
      } = request.params;

      const post = await CommunityPostModel.findOne({
        id: postId,
      });

      if (!post) {
        response.status(404).json({
          message: '게시글을 찾을 수 없습니다.',
        });

        return;
      }

     const commentIndex = post.comments.findIndex(
  (comment) => comment.id === commentId,
);

if (commentIndex === -1) {
  response.status(404).json({
    message: '댓글을 찾을 수 없습니다.',
  });

  return;
}

post.comments.splice(commentIndex, 1);
     
      await post.save();

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
