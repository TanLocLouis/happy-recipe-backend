import prisma from '../config/prisma.js';
import { sendModeratorWarning } from '../services/mailer.js';

/**
 * Get all posts with pagination and filtering (for moderators)
 */
export async function getAllPosts(req, res) {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  let limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  let offset = (page - 1) * limit;

  if (req.query.start && req.query.end) {
    limit =
      Math.min(Math.max(parseInt(req.query.end, 10) - parseInt(req.query.start, 10), 1), 100) + 1;
    offset = Math.max(parseInt(req.query.start, 10), 0);
  }

  // Filter options
  const postStatus = req.query.status;
  const userId = req.query.userId; // Filter by user
  const searchTerm = req.query.search; // Search in title/description

  try {
    // Build where clause
    const where = {};
    if (postStatus === "active") {
      where.is_deleted = false;
    } else if (postStatus === "deleted") {
      where.is_deleted = true;
    }

    if (userId) {
      where.user_id = userId;
    }

    if (searchTerm) {
      where.OR = [{ title: { contains: searchTerm } }, { description: { contains: searchTerm } }];
    }

    const [posts, total] = await Promise.all([
      prisma.posts.findMany({
        where,
        include: {
          users: {
            select: {
              user_id: true,
              username: true,
              display_name: true,
              email: true,
              profile_image_url: true,
              role: true,
              is_active: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              bookmarks: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.posts.count({ where }),
    ]);

    const formattedPosts = posts.map((post) => ({
      postId: post.post_id,
      title: post.title,
      description: post.description,
      cookTime: post.cook_time,
      servings: post.servings,
      difficulty: post.difficulty,
      coverImgUrl: process.env.SERVER_URL + post.cover_image_url,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      isDeleted: post.is_deleted,
      deletedAt: post.deleted_at,
      deletedBy: post.deleted_by,
      author: {
        userId: post.users.user_id,
        authorName: post.users.username,
        displayName: post.users.display_name,
        email: post.users.email,
        authorImgUrl: post.users.profile_image_url
          ? process.env.SERVER_URL + post.users.profile_image_url
          : null,
        role: post.users.role,
        isActive: post.users.is_active,
      },
      stats: {
        comments: post._count.comments,
        reactions: post._count.reactions,
        bookmarks: post._count.bookmarks,
      },
    }));

    return res.status(200).json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get all comments with pagination and filtering (for moderators)
 */
export async function getAllComments(req, res) {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const offset = (page - 1) * limit;

  // Filter options
  const includeDeleted = req.query.includeDeleted === "true";
  const userId = req.query.userId; // Filter by user
  const postId = req.query.postId; // Filter by post
  const searchTerm = req.query.search; // Search in comment text

  try {
    // Build where clause
    const where = {};

    if (!includeDeleted) {
      where.is_deleted = false;
    }

    if (userId) {
      where.user_id = userId;
    }

    if (postId) {
      where.post_id = postId;
    }

    if (searchTerm) {
      where.comment_text = { contains: searchTerm };
    }

    const [comments, total] = await Promise.all([
      prisma.comments.findMany({
        where,
        include: {
          users: {
            select: {
              user_id: true,
              username: true,
              display_name: true,
              email: true,
              role: true,
              is_active: true,
            },
          },
          posts: {
            select: {
              post_id: true,
              title: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.comments.count({ where }),
    ]);

    const formattedComments = comments.map((comment) => ({
      commentId: String(comment.comment_id),
      postId: comment.post_id,
      postTitle: comment.posts.title,
      userId: comment.user_id,
      commentText: comment.comment_text,
      parentCommentId: comment.parent_comment_id ? String(comment.parent_comment_id) : null,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      isDeleted: comment.is_deleted,
      displayName: comment.users.display_name,
      author: {
        userId: comment.users.user_id,
        username: comment.users.username,
        displayName: comment.users.display_name,
        email: comment.users.email,
        role: comment.users.role,
        isActive: comment.users.is_active,
      },
    }));

    return res.status(200).json({
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get all users with pagination and filtering (for moderators)
 */
export async function getAllUsers(req, res) {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const offset = (page - 1) * limit;

  // Filter options
  const role = req.query.role; // Filter by role (USER, MODERATOR, ADMIN)
  const isActive = req.query.isActive; // Filter by active status
  const searchTerm = req.query.search; // Search in username/email/display_name

  try {
    // Build where clause
    const where = {};

    if (role && ["USER", "MODERATOR", "ADMIN"].includes(role)) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    if (searchTerm) {
      where.OR = [
        { username: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { display_name: { contains: searchTerm } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        select: {
          user_id: true,
          username: true,
          email: true,
          display_name: true,
          bio: true,
          profile_image_url: true,
          role: true,
          created_at: true,
          updated_at: true,
          last_login: true,
          is_verified: true,
          is_active: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              reactions: true,
              bookmarks: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.users.count({ where }),
    ]);

    const formattedUsers = users.map((user) => ({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      bio: user.bio,
      profileImageUrl: user.profile_image_url,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login,
      isVerified: user.is_verified,
      isActive: user.is_active,
      stats: {
        posts: user._count.posts,
        comments: user._count.comments,
        reactions: user._count.reactions,
        bookmarks: user._count.bookmarks,
      },
    }));

    return res.status(200).json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a post (soft delete)
 */
export async function deletePost(req, res) {
  const { postId } = req.params;
  const moderatorId = req.userId; // From authenticate middleware

  try {
    // Check if post exists
    const post = await prisma.posts.findUnique({
      where: { post_id: postId },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Soft delete: mark as deleted
    const updatedPost = await prisma.posts.update({
      where: { post_id: postId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: moderatorId,
      },
    });

    // Log moderation action
    await prisma.post_moderation.create({
      data: {
        actor_user_id: moderatorId,
        target_type: "post",
        target_post_id: postId,
        reason: "Post deleted by moderator",
      },
    });

    return res.status(200).json({ message: "Post deleted successfully", postId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Restore a deleted post
 */
export async function restorePost(req, res) {
  const { postId } = req.params;
  const moderatorId = req.userId; // From authenticate middleware

  try {
    // Check if post exists
    const post = await prisma.posts.findUnique({
      where: { post_id: postId },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if post is already deleted
    if (!post.is_deleted) {
      return res.status(400).json({ message: "Post is not deleted" });
    }

    // Restore: mark as not deleted
    const restoredPost = await prisma.posts.update({
      where: { post_id: postId },
      data: {
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      },
    });

    // Log moderation action
    await prisma.post_moderation.create({
      data: {
        actor_user_id: moderatorId,
        target_type: "post",
        target_post_id: postId,
        reason: "Post restored by moderator",
      },
    });

    return res.status(200).json({ message: "Post restored successfully", postId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(req, res) {
  const { commentId } = req.params;
  const moderatorId = req.userId; // From authenticate middleware

  try {
    // Check if comment exists
    const comment = await prisma.comments.findUnique({
      where: { comment_id: BigInt(commentId) },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Soft delete: mark as deleted
    const updatedComment = await prisma.comments.update({
      where: { comment_id: BigInt(commentId) },
      data: {
        is_deleted: true,
      },
    });

    // Log moderation action
    await prisma.post_moderation.create({
      data: {
        actor_user_id: moderatorId,
        target_type: "comment",
        target_comment_id: BigInt(commentId),
        reason: "Comment deleted by moderator",
      },
    });

    return res.status(200).json({ message: "Comment deleted successfully", commentId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Warn a user
 */
export async function warnUser(req, res) {
  const { userId } = req.params;
  const { reason } = req.body;
  const moderatorId = req.userId; // From authenticate middleware

  try {
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({ message: "Reason is required" });
    }

    // Check if target user exists
    const targetUser = await prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create warning record (actor_user_id, target_user_id)
    const warning = await prisma.user_moderation.create({
      data: {
        actor_user_id: moderatorId,
        target_user_id: userId,
        action_type: "warning",
        reason: reason.trim(),
      },
    });

    return res.status(200).json({
      message: "User warned successfully",
      warningId: warning.action_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Ban a user
 */
export async function banUser(req, res) {
  const { userId } = req.params;
  const { reason } = req.body;
  const moderatorId = req.userId; // From authenticate middleware

  try {
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({ message: "Reason is required" });
    }

    // Check if target user exists
    const targetUser = await prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Cannot ban admin
    if (targetUser.role === "ADMIN") {
      return res.status(403).json({ message: "Cannot ban admin users" });
    }

    // Ban user (set is_active to false)
    await prisma.users.update({
      where: { user_id: userId },
      data: { is_active: false },
    });

    // Create ban record (actor_user_id, target_user_id)
    const ban = await prisma.user_moderation.create({
      data: {
        actor_user_id: moderatorId,
        target_user_id: userId,
        action_type: "ban",
        reason: reason.trim(),
      },
    });

    return res.status(200).json({
      message: "User banned successfully",
      banId: ban.action_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Unban a user
 */
export async function unbanUser(req, res) {
  const { userId } = req.params;
  const moderatorId = req.userId; // From authenticate middleware

  try {
    // Check if target user exists
    const targetUser = await prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.is_active) {
      return res.status(400).json({ message: "User is not banned" });
    }

    // Unban user (set is_active to true)
    await prisma.users.update({
      where: { user_id: userId },
      data: { is_active: true },
    });

    // Log unban action in user_moderation (actor_user_id, target_user_id)
    await prisma.user_moderation.create({
      data: {
        actor_user_id: moderatorId,
        target_user_id: userId,
        action_type: "unban",
        reason: "User unbanned by moderator",
      },
    });

    return res.status(200).json({ message: "User unbanned successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get moderation statistics (for dashboard)
 */
export async function getModerationStats(req, res) {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      deletedPosts,
      totalComments,
      deletedComments,
      moderators,
      admins,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { is_active: true } }),
      prisma.posts.count(),
      prisma.posts.count({ where: { is_deleted: true } }),
      prisma.comments.count(),
      prisma.comments.count({ where: { is_deleted: true } }),
      prisma.users.count({ where: { role: "MODERATOR" } }),
      prisma.users.count({ where: { role: "ADMIN" } }),
    ]);

    return res.status(200).json({
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      posts: {
        total: totalPosts,
        active: totalPosts - deletedPosts,
        deleted: deletedPosts,
      },
      comments: {
        total: totalComments,
        active: totalComments - deletedComments,
        deleted: deletedComments,
      },
      staff: {
        moderators,
        admins,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Notify user about a post (moderator action)
 */
export async function notifyUser(req, res) {
  const { postId } = req.params;
  const { message } = req.body;
  const moderatorId = req.userId; // From authenticate middleware

  try {
    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Check if post exists
    const post = await prisma.posts.findUnique({
      where: { post_id: postId },
      include: {
        users: {
          select: { user_id: true },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create notification
    const notification = await prisma.notifications.create({
      data: {
        post_id: postId,
        user_id: post.users.user_id,
        moderator_id: moderatorId,
        message: message.trim(),
      },
    });

    return res.status(201).json({
      message: "Notification sent successfully",
      notification: {
        notificationId: notification.notification_id,
        postId: notification.post_id,
        userId: notification.user_id,
        moderatorId: notification.moderator_id,
        message: notification.message,
        isRead: notification.is_read,
        createdAt: notification.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Notify user about a post (moderator action)
 */
export async function notifyUserWarned(req, res) {
  const { userId } = req.params;
  const { message } = req.body;
  const moderatorId = req.userId;

  try {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const targetUser = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { email: true, display_name: true, username: true }
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendlyName = targetUser.display_name || targetUser.username || 'người dùng';
    const emailMessage = `Chào ${friendlyName},\n\n${message.trim()}\n\n(Được gửi bởi moderator).`;

    await sendModeratorWarning(targetUser.email, emailMessage);

    return res.status(200).json({ message: 'Warning email sent successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
