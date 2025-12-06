import prisma from '../config/prisma.js';

/**
 * Unified endpoint to handle user actions (reactions and bookmarks)
 * Accepts ActionPayload format: { action: "reaction" | "bookmark", postId, newReaction?, newBookmark? }
 * Requires authentication middleware
 */
export async function uploadUserAction(req, res) {
  const userId = req.userId;

  try {
    // userId is available from authenticate middleware

    // Extract request body
    const { action, postId, newReaction, newBookmark } = req.body;

    if (!action || !postId) {
      return res.status(400).json({ message: 'action and postId are required' });
    }

    if (!['reaction', 'bookmark'].includes(action)) {
      return res.status(400).json({ message: 'action must be either "reaction" or "bookmark"' });
    }

    // Verify post exists
    const post = await prisma.posts.findFirst({
      where: { post_id: postId, is_deleted: false }
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (action === 'reaction') {
      // Handle reaction action
      const reaction = newReaction;

      // Validate reaction type if provided
      if (reaction !== null && !['like', 'heart', 'yum'].includes(reaction)) {
        return res.status(400).json({ message: 'Invalid reaction type. Must be like, heart, yum, or null' });
      }

      // Check if user already has a reaction for this post
      const existingReaction = await prisma.reactions.findUnique({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId
          }
        }
      });

      if (reaction === null) {
        // Remove reaction if it exists
        if (existingReaction) {
          await prisma.reactions.delete({
            where: {
              user_id_post_id: {
                user_id: userId,
                post_id: postId
              }
            }
          });
        }
        return res.status(200).json({ message: 'Reaction removed successfully' });
      } else {
        // Upsert reaction (create or update)
        await prisma.reactions.upsert({
          where: {
            user_id_post_id: {
              user_id: userId,
              post_id: postId
            }
          },
          update: {
            reaction_type: reaction
          },
          create: {
            user_id: userId,
            post_id: postId,
            reaction_type: reaction
          }
        });
        return res.status(200).json({ message: 'Reaction updated successfully' });
      }
    } else if (action === 'bookmark') {
      // Handle bookmark action
      if (typeof newBookmark !== 'boolean') {
        return res.status(400).json({ message: 'newBookmark must be a boolean value' });
      }

      // Check if bookmark already exists
      const existingBookmark = await prisma.bookmarks.findUnique({
        where: { unique_user_post_bookmark: { user_id: userId, post_id: postId } }
      });
      
      if (newBookmark) {
        // Add bookmark if it doesn't exist
        if (!existingBookmark) {
          console.log('Creating new bookmark');
          await prisma.bookmarks.create({ data: { user_id: userId, post_id: postId } });
        }
        return res.status(200).json({ message: 'Bookmark added successfully' });
      } else {
        console.log('Removing bookmark if exists');
        // Remove bookmark if it exists
        if (existingBookmark) {
          await prisma.bookmarks.delete({
            where: { unique_user_post_bookmark: { user_id: userId, post_id: postId } }
          });
        }
        return res.status(200).json({ message: 'Bookmark removed successfully' });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listBookmarks(req, res) {
  try {
    // userId is available from authenticate middleware
    const userId = req.userId;

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
            users: { select: { user_id: true, username: true, display_name: true } }
          }
        }
      },
      orderBy: { bookmark_id: 'desc' }
    });

    const bookmarks = rows
      .filter(r => r.posts && !r.posts.is_deleted)
      .map(r => {
        const p = r.posts;
        const author = p.users || null;
        return {
          postId: p.post_id,
          title: p.title,
          coverImgUrl: p.cover_image_url || null,
          authorId: p.user_id,
          authorName: author ? (author.display_name || author.username || null) : null,
          cookTime: p.cook_time ?? null,
          servings: p.servings ?? null,
          difficulty: p.difficulty || null,
          createdAt: p.created_at
        };
      });

    return res.status(200).json({ bookmarks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

