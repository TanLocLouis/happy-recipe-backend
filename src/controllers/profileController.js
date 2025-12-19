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

export async function listUserPosts(req, res) {
  console.log('[DEBUG] listUserPosts called');
  try {
    const profileUserId = req.params.userId;
    const viewerUserId = req.userId || null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Build dynamic select to include viewer-specific relations only when authenticated
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
      where: { user_id: profileUserId, is_deleted: false },
      select: postSelect,
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
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

    const userPosts = posts.map(p => {
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

    return res.status(200).json({ userPosts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function editProfile(req, res) {
  console.log('[DEBUG] editProfile called');
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
    }

    const { displayName, bio } = req.body;
    const data = {};

    if (displayName !== undefined && displayName !== null && displayName.trim() !== '') {
      data.display_name = displayName.trim();
    }
    if (bio !== undefined && bio !== null && bio.trim() !== '') {
      data.bio = bio.trim();
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const updated = await prisma.users.update({
      where: { user_id: userId },
      data,
      select: {
        user_id: true,
        username: true,
        display_name: true,
        bio: true,
        profile_image_url: true
      }
    });

    return res.status(200).json({
      profile: {
        userId: updated.user_id,
        username: updated.username,
        displayName: updated.display_name,
        bio: updated.bio,
        avatarUrl: updated.profile_image_url || null
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

