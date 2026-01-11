import prisma from "../config/prisma.js";

export async function getUserProfile(req, res) {
  const { user_id } = req.params;
  console.log("[DEBUG] Fetching profile for user_id:", user_id);

  try {
    if (!user_id) {
      return res.status(400).json({ message: "Missing userId" });
    }

    const user = await prisma.users.findUnique({
      where: { user_id },
      select: {
        user_id: true,
        username: true,
        display_name: true,
        email: true,
        is_active: true,
        bio: true,
        profile_image_url: true,
        is_verified: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const userInfo = {
      userId: user.user_id,
      username: user.username || null,
      displayName: user.display_name || null,
      email: user.email,
      bio: user.bio || null,
      profileImageUrl: user.profile_image_url
        ? process.env.SERVER_URL + user.profile_image_url
        : null,
      isVerified: user.is_verified || false,
    };

    return res.status(200).json(userInfo);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get user notifications with pagination
 */
export async function getUserNotifications(req, res) {
  const userId = req.userId; // From authenticate middleware
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const offset = (page - 1) * limit;

  try {
    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where: { user_id: userId },
        include: {
          posts: {
            select: {
              post_id: true,
              title: true,
              cover_image_url: true,
            },
          },
          moderators: {
            select: {
              user_id: true,
              username: true,
              display_name: true,
              profile_image_url: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.notifications.count({ where: { user_id: userId } }),
    ]);

    const formattedNotifications = notifications.map((notif) => ({
      notificationId: notif.notification_id,
      postId: notif.post_id,
      message: notif.message,
      isRead: notif.is_read,
      createdAt: notif.created_at,
      post: {
        postId: notif.posts.post_id,
        title: notif.posts.title,
        coverImageUrl: notif.posts.cover_image_url
          ? process.env.SERVER_URL + notif.posts.cover_image_url
          : null,
      },
      moderator: {
        userId: notif.moderators.user_id,
        username: notif.moderators.username,
        displayName: notif.moderators.display_name,
        profileImageUrl: notif.moderators.profile_image_url
          ? process.env.SERVER_URL + notif.moderators.profile_image_url
          : null,
      },
    }));

    return res.status(200).json({
      notifications: formattedNotifications,
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
 * Mark notification as read
 */
export async function markNotificationAsRead(req, res) {
  console.log("[DEBUG] markNotificationAsRead called");  

  const { notificationId } = req.params;
  const userId = req.userId; // From authenticate middleware

  try {
    // Check if notification exists and belongs to user
    const notification = await prisma.notifications.findUnique({
      where: { notification_id: BigInt(notificationId) },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.user_id !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Mark as read
    const updated = await prisma.notifications.update({
      where: { notification_id: BigInt(notificationId) },
      data: { is_read: true },
    });

    return res.status(200).json({
      message: "Notification marked as read",
      notificationId: updated.notification_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get posts by a specific user with pagination
 */
export async function getUserPosts(req, res) {
  console.log("[DEBUG] getUserPosts called");

  const { user_id } = req.params;
  const currentUserId = req.userId || null; // From optionalAuthenticate middleware
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const offset = (page - 1) * limit;

  try {
    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { user_id },
      select: { user_id: true, username: true, display_name: true, profile_image_url: true, is_active: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    const [posts, total] = await Promise.all([
      prisma.posts.findMany({
        where: { user_id, is_deleted: false },
        include: {
          reactions: {
            select: { reaction_type: true, user_id: true }
          },
          bookmarks: {
            select: { user_id: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.posts.count({ where: { user_id, is_deleted: false } })
    ]);

    const userPosts = posts.map(post => {
      // Count reactions by type
      const reactionCounts = { like: 0, heart: 0, yum: 0 };
      let userReaction = null;
      for (const r of post.reactions) {
        if (r.reaction_type) reactionCounts[r.reaction_type]++;
        if (currentUserId && r.user_id === currentUserId) {
          userReaction = r.reaction_type;
        }
      }

      // Check if current user bookmarked this post
      const userBookmark = currentUserId
        ? post.bookmarks.some(b => b.user_id === currentUserId)
        : false;

      return {
        postId: post.post_id,
        title: post.title,
        coverImgUrl: post.cover_image_url ? process.env.SERVER_URL + post.cover_image_url : null,
        authorId: user.user_id,
        authorName: user.display_name || user.username,
        authorImgUrl: user.profile_image_url ? process.env.SERVER_URL + user.profile_image_url : null,
        cookTime: post.cook_time,
        servings: post.servings,
        difficulty: post.difficulty,
        reactions: reactionCounts,
        userActions: {
          userReaction,
          userBookmark
        }
      };
    });

    return res.status(200).json({
      userPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
