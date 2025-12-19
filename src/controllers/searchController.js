import prisma from '../config/prisma.js';

export async function searchPosts(req, res) {
  console.log('[DEBUG] searchPosts called');
  try {
    const searchQuery = req.query.query?.trim() || '';
    const viewerUserId = req.userId || null;

    if (!searchQuery) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Search posts by title (case-insensitive)
    const postSelect = {
      post_id: true,
      user_id: true,
      title: true,
      cook_time: true,
      servings: true,
      difficulty: true,
      cover_image_url: true,
      created_at: true,
      users: { select: { user_id: true, username: true, display_name: true } }
    };

    if (viewerUserId) {
      // @ts-ignore dynamic field add
      postSelect.reactions = {
        where: { user_id: viewerUserId },
        select: { reaction_type: true }
      };
      // @ts-ignore dynamic field add
      postSelect.bookmarks = {
        where: { user_id: viewerUserId },
        select: { bookmark_id: true }
      };
    }

    const posts = await prisma.posts.findMany({
      where: {
        is_deleted: false,
        title: {
          contains: searchQuery
        }
      },
      select: postSelect,
      orderBy: { created_at: 'desc' }
    });

    const postIds = posts.map(p => p.post_id);

    // Get per-type reaction counts for these posts
    let grouped = [];
    if (postIds.length > 0) {
      grouped = await prisma.reactions.groupBy({
        by: ['post_id', 'reaction_type'],
        where: { post_id: { in: postIds } },
        _count: { _all: true }
      });
    }

    const countsMap = new Map();
    for (const pId of postIds) {
      countsMap.set(pId, { like: 0, heart: 0, yum: 0 });
    }
    for (const g of grouped) {
      const entry = countsMap.get(g.post_id) || { like: 0, heart: 0, yum: 0 };
      if (g.reaction_type === 'like') entry.like = g._count._all;
      else if (g.reaction_type === 'heart') entry.heart = g._count._all;
      else if (g.reaction_type === 'yum') entry.yum = g._count._all;
      countsMap.set(g.post_id, entry);
    }

    const searchResults = posts.map(p => {
      const author = p.users || null;
      const userReaction = p.reactions && p.reactions.length > 0 ? p.reactions[0].reaction_type : null;
      const userBookmark = p.bookmarks ? p.bookmarks.length > 0 : false;
      const reactionCounts = countsMap.get(p.post_id) || { like: 0, heart: 0, yum: 0 };
      return {
        postId: p.post_id,
        title: p.title,
        coverImgUrl: p.cover_image_url || null,
        authorID: p.user_id,
        authorName: author ? (author.display_name || author.username || null) : null,
        cookTime: p.cook_time ?? null,
        servings: p.servings ?? null,
        difficulty: p.difficulty || null,
        reactions: reactionCounts,
        userActions: {
          userReaction: userReaction,
          userBookmark: userBookmark
        }
      };
    });

    return res.status(200).json({ searchResults });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
