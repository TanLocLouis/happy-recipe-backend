import prisma from '../config/prisma.js';
import { randomBytes } from 'crypto';
import { verifyToken } from '../utils/jwt.js';

function generatePostId() {
  return randomBytes(4).toString('hex'); // 8 hex chars -> fits `char(8)`
}

function mapIngredient(ing) {
  if (!ing) return null;
  return {
    ingredientId: ing.ingredient_id,
    itemOrder: ing.item_order,
    ingredientText: ing.ingredient_text
  };
}

function mapStep(st) {
  if (!st) return null;
  return {
    stepId: st.step_id,
    stepNumber: st.step_number,
    stepDescription: st.step_description,
    imageUrl: st.image_url
  };
}

function mapPost(post) {
  if (!post) return null;
  return {
    postId: post.post_id,
    userId: post.user_id,
    title: post.title,
    description: post.description,
    cookTime: post.cook_time,
    servings: post.servings,
    difficulty: post.difficulty,
    coverImageUrl: post.cover_image_url,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    isDeleted: post.is_deleted,
    deletedAt: post.deleted_at,
    deletedBy: post.deleted_by,
    ingredients: Array.isArray(post.ingredients) ? post.ingredients.map(mapIngredient) : [],
    steps: Array.isArray(post.steps) ? post.steps.map(mapStep) : []
  };
}

export async function createPost(req, res) {
  const {
    userId,
    title,
    description,
    cookTime,
    servings,
    difficulty,
    coverImageUrl,
    ingredients,
    steps
  } = req.body;

//   console.log(userId, title, description, cookTime, servings, difficulty, coverImageUrl, ingredients, steps);

  if (!userId || !title) return res.status(400).json({ message: 'userId and title are required' });

  const postId = generatePostId();

  try {
    const ingredientsCreate = Array.isArray(ingredients) && ingredients.length > 0
      ? ingredients
          .map(ing => ({
            item_order: typeof ing.itemOrder === 'number' ? ing.itemOrder : (ing.item_order ?? 0),
            ingredient_text: ing.ingredientText || ing.text || ing.ingredient_text || null
          }))
          .filter(i => i.ingredient_text)
      : undefined;

    const stepsCreate = Array.isArray(steps) && steps.length > 0
      ? steps
          .map(st => ({
            step_number: typeof st.stepNumber === 'number' ? st.stepNumber : (st.step_number ?? 0),
            step_description: st.stepDescription || st.description || st.step_description || null,
            image_url: st.image_url || st.image || null
          }))
          .filter(s => s.step_description)
      : undefined;

    const created = await prisma.$transaction(async (tx) => {
      return await tx.posts.create({
        data: {
          post_id: postId,
          user_id: userId,
          title,
          description: description || null,
          cook_time: cookTime ?? null,
          servings: servings ?? null,
          difficulty: difficulty || null,
          cover_image_url: coverImageUrl || null,
          ingredients: ingredientsCreate ? { create: ingredientsCreate } : undefined,
          steps: stepsCreate ? { create: stepsCreate } : undefined
        }
      });
    });

    return res.status(201).json({ postId: created.post_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPostByID(req, res) {
  const { id } = req.params;
  try {
    const post = await prisma.posts.findFirst({
      where: { post_id: id, is_deleted: false },
      include: {
        ingredients: { orderBy: { item_order: 'asc' } },
        steps: { orderBy: { step_number: 'asc' } }
      }
    });

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const mappedPost = mapPost(post);

    return res.status(200).json({ post: mappedPost });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listPosts(req, res) {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);
  try {
    const rows = await prisma.posts.findMany({
      where: { is_deleted: false },
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
        deleted_by: true
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });
    const posts = rows.map(r => ({
      postId: r.post_id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      cookTime: r.cook_time,
      servings: r.servings,
      difficulty: r.difficulty,
      coverImageUrl: r.cover_image_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isDeleted: r.is_deleted,
      deletedAt: r.deleted_at,
      deletedBy: r.deleted_by
    }));
    return res.status(200).json({ posts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function discoverPosts(req, res) {
  const pageParam = req.query.page;
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);
  try {
    // optional current user id to compute per-user actions
    const currentUserId = req.query.userId || null;

    const rows = await prisma.posts.findMany({
      where: { is_deleted: false },
      select: {
        post_id: true,
        user_id: true,
        title: true,
        cook_time: true,
        servings: true,
        difficulty: true,
        cover_image_url: true,
        users: { select: { user_id: true, username: true, display_name: true } }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    const postIds = rows.map(r => r.post_id);

    // fetch reactions for these posts
    const reactionsRows = postIds.length > 0
      ? await prisma.reactions.findMany({ where: { post_id: { in: postIds } }, select: { post_id: true, reaction_type: true, user_id: true } })
      : [];

    // build reactions map: { postId: { like: n, heart: n, yum: n, total: n } }
    const reactionsMap = {};
    for (const r of reactionsRows) {
      const pid = r.post_id;
      if (!reactionsMap[pid]) reactionsMap[pid] = { like: 0, heart: 0, yum: 0, total: 0 };
      const type = r.reaction_type || 'like';
      if (!reactionsMap[pid][type]) reactionsMap[pid][type] = 0;
      reactionsMap[pid][type]++;
      reactionsMap[pid].total++;
    }

    // if current user specified, fetch their reactions and favorites
    let userReactions = [];
    let userFavorites = [];
    if (currentUserId) {
      userReactions = await prisma.reactions.findMany({ where: { post_id: { in: postIds }, user_id: currentUserId }, select: { post_id: true, reaction_type: true } });
      userFavorites = await prisma.favorites.findMany({ where: { post_id: { in: postIds }, user_id: currentUserId }, select: { post_id: true } });
    }

    const favSet = new Set(userFavorites.map(f => f.post_id));
    const userReactionMap = {};
    for (const ur of userReactions) userReactionMap[ur.post_id] = ur.reaction_type || null;

    const postList = rows.map(r => {
      const author = r.users || null;
      const pid = r.post_id;
      const react = reactionsMap[pid] || { like: 0, heart: 0, yum: 0, total: 0 };
      const userAction = {
        favorited: currentUserId ? favSet.has(pid) : false,
        reaction: currentUserId ? (userReactionMap[pid] || null) : null
      };

      return {
        postId: pid,
        title: r.title,
        coverImgUrl: r.cover_image_url || null,
        authorId: r.user_id,
        authorName: author ? (author.display_name || author.username || null) : null,
        cookTime: r.cook_time ?? null,
        servings: r.servings ?? null,
        difficulty: r.difficulty || null,
        reactions: react,
        userActions: userAction
      };
    });

    return res.status(200).json({ postList });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getLatestPosts(req, res) {
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);
  const includeDetails = req.query.details === '1' || req.query.details === 'true';

  try {
    if (!includeDetails) {
      const rows = await prisma.posts.findMany({
        where: { is_deleted: false },
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
          deleted_by: true
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      });
      const posts = rows.map(r => ({
        postId: r.post_id,
        userId: r.user_id,
        title: r.title,
        description: r.description,
        cookTime: r.cook_time,
        servings: r.servings,
        difficulty: r.difficulty,
        coverImageUrl: r.cover_image_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        isDeleted: r.is_deleted,
        deletedAt: r.deleted_at,
        deletedBy: r.deleted_by
      }));
      return res.status(200).json({ posts });
    }

    const postsRaw = await prisma.posts.findMany({
      where: { is_deleted: false },
      include: {
        ingredients: { orderBy: { item_order: 'asc' } },
        steps: { orderBy: { step_number: 'asc' } }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    const posts = postsRaw.map(mapPost);

    return res.status(200).json({ posts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update user reaction to a post
 * Handles adding, updating, or removing reactions (like, heart, yum)
 */
export async function updateReaction(req, res) {
  try {
    // Extract userId from JWT token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const userId = payload.userId || payload.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Extract request body
    const { reaction, postId } = req.body;

    if (!postId) {
      return res.status(400).json({ message: 'postId is required' });
    }

    // Validate reaction type if provided
    if (reaction !== null && !['like', 'heart', 'yum'].includes(reaction)) {
      return res.status(400).json({ message: 'Invalid reaction type. Must be like, heart, yum, or null' });
    }

    // Verify post exists
    const post = await prisma.posts.findFirst({
      where: { post_id: postId, is_deleted: false }
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already has a reaction for this post
    const existingReaction = await prisma.reactions.findUnique({
      where: {
        unique_user_post_reaction: {
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
            unique_user_post_reaction: {
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
          unique_user_post_reaction: {
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update user bookmark (favorite) for a post
 * Handles adding or removing bookmarks
 */
export async function updateBookmark(req, res) {
  try {
    // Extract userId from JWT token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const userId = payload.userId || payload.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Extract request body
    const { bookmark, postId } = req.body;

    if (!postId) {
      return res.status(400).json({ message: 'postId is required' });
    }

    if (typeof bookmark !== 'boolean') {
      return res.status(400).json({ message: 'bookmark must be a boolean value' });
    }

    // Verify post exists
    const post = await prisma.posts.findFirst({
      where: { post_id: postId, is_deleted: false }
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if bookmark already exists
    const existingBookmark = await prisma.favorites.findUnique({
      where: {
        unique_user_post_favorite: {
          user_id: userId,
          post_id: postId
        }
      }
    });

    if (bookmark) {
      // Add bookmark if it doesn't exist
      if (!existingBookmark) {
        await prisma.favorites.create({
          data: {
            user_id: userId,
            post_id: postId
          }
        });
      }
      return res.status(200).json({ message: 'Bookmark added successfully' });
    } else {
      // Remove bookmark if it exists
      if (existingBookmark) {
        await prisma.favorites.delete({
          where: {
            unique_user_post_favorite: {
              user_id: userId,
              post_id: postId
            }
          }
        });
      }
      return res.status(200).json({ message: 'Bookmark removed successfully' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}



