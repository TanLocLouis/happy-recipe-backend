import prisma from '../config/prisma.js';

export async function listBookmarks(req, res) {
  console.log('[DEBUG] listBookmarks called');
  try {
    // userId is available from authenticate middleware
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const rows = await prisma.bookmarks.findMany({
      where: { user_id: userId },
      include: {
        posts: {
          select: {
            post_id: true,
            user_id: true,
            title: true,
            description: true,
            cook_time: true,
            servings: true,
            difficulty: true,
            cover_image_url: true,
            created_at: true,
            updated_at: true,
            is_deleted: true,
            deleted_at: true,
            deleted_by: true,
            users: { select: { user_id: true, username: true, display_name: true } },
            _count: {
              select: {
                reactions: true,
                comments: true
              }
            },
            reactions: {
              where: { user_id: userId },
              select: { reaction_type: true }
            },
            bookmarks: {
              where: { user_id: userId },
              select: { bookmark_id: true }
            }
          }
        }
      },
      orderBy: { bookmark_id: 'desc' },
      skip: offset,
      take: limit
    });

    const bookmarkedPosts = rows
      .filter(r => r.posts && !r.posts.is_deleted)
      .map(r => {
        const p = r.posts;
        const author = p.users || null;
        const userReaction = p.reactions && p.reactions.length > 0 ? p.reactions[0].reaction_type : null;
        
        return {
          postId: p.post_id,
          title: p.title,
          coverImgUrl: p.cover_image_url || null,
          authorID: p.user_id,
          authorName: author ? (author.display_name || author.username || null) : null,
          cookTime: p.cook_time ?? null,
          servings: p.servings ?? null,
          difficulty: p.difficulty || null,
          reactions: {
            total: p._count.reactions || 0,
            comments: p._count.comments || 0
          },
          userActions: {
            userReaction: userReaction,
            userBookmark: p.bookmarks && p.bookmarks.length > 0
          }
        };
      });

    return res.status(200).json({ bookmarkedPosts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

