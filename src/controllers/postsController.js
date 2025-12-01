import prisma from '../config/prisma.js';
import { randomBytes } from 'crypto';

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
    const postList = rows.map(r => ({
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
