import { pool } from '../config/db.js';
import { randomBytes } from 'crypto';

function generatePostId() {
  return randomBytes(4).toString('hex'); // 8 hex chars -> fits `char(8)`
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

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query(
      'INSERT INTO posts (post_id, user_id, title, description, cook_time, servings, difficulty, cover_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [postId, userId, title, description || null, cookTime || null, servings || null, difficulty || null, coverImageUrl || null]
    );

    if (Array.isArray(ingredients) && ingredients.length > 0) {
      for (const ing of ingredients) {
        const itemOrder = ing.itemOrder ?? null;
        const ingredientText = ing.ingredientText || ing.text || null;
        if (!ingredientText) continue;
        await conn.query(
          'INSERT INTO ingredients (post_id, item_order, ingredient_text) VALUES (?, ?, ?)',
          [postId, itemOrder, ingredientText]
        );
      }
    }

    if (Array.isArray(steps) && steps.length > 0) {
      for (const st of steps) {
        const stepNumber = st.stepNumber ?? null;
        const stepDescription = st.stepDescription || st.description || null;
        const imageUrl = st.image_url || st.image || null;
        if (!stepDescription) continue;
        await conn.query(
          'INSERT INTO steps (post_id, step_number, step_description, image_url) VALUES (?, ?, ?, ?)',
          [postId, stepNumber, stepDescription, imageUrl]
        );
      }
    }

    await conn.commit();

    return res.status(201).json({ postId });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
}

export async function getPost(req, res) {
  const { id } = req.params;
  try {
    const [posts] = await pool.query(
      'SELECT post_id, user_id, title, description, cook_time, servings, difficulty, cover_image_url, created_at, updated_at FROM posts WHERE post_id = ? AND is_deleted = 0 LIMIT 1',
      [id]
    );

    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

    const post = posts[0];

    const [ingredients] = await pool.query(
      'SELECT ingredient_id, item_order, ingredient_text FROM ingredients WHERE post_id = ? ORDER BY item_order',
      [id]
    );

    const [steps] = await pool.query(
      'SELECT step_id, step_number, step_description, image_url FROM steps WHERE post_id = ? ORDER BY step_number',
      [id]
    );

    post.ingredients = ingredients;
    post.steps = steps;

    return res.status(200).json(post);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listPosts(req, res) {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);
  try {
    const [rows] = await pool.query(
      'SELECT post_id, user_id, title, description, cook_time, servings, difficulty, cover_image_url, created_at FROM posts WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return res.status(200).json({ posts: rows });
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
    const [posts] = await pool.query(
      'SELECT post_id, user_id, title, description, cook_time, servings, difficulty, cover_image_url, created_at FROM posts WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    if (!includeDetails || posts.length === 0) return res.status(200).json({ posts });

    const postIds = posts.map(p => p.post_id);
    const placeholders = postIds.map(() => '?').join(',');

    const [ingredientsRows] = await pool.query(
      `SELECT post_id, ingredient_id, item_order, ingredient_text FROM ingredients WHERE post_id IN (${placeholders}) ORDER BY item_order`,
      postIds
    );

    const [stepsRows] = await pool.query(
      `SELECT post_id, step_id, step_number, step_description, image_url FROM steps WHERE post_id IN (${placeholders}) ORDER BY step_number`,
      postIds
    );

    const ingredientsMap = {};
    for (const ing of ingredientsRows) {
      if (!ingredientsMap[ing.post_id]) ingredientsMap[ing.post_id] = [];
      ingredientsMap[ing.post_id].push(ing);
    }

    const stepsMap = {};
    for (const st of stepsRows) {
      if (!stepsMap[st.post_id]) stepsMap[st.post_id] = [];
      stepsMap[st.post_id].push(st);
    }

    const postsWithDetails = posts.map(p => ({
      ...p,
      ingredients: ingredientsMap[p.post_id] || [],
      steps: stepsMap[p.post_id] || []
    }));

    return res.status(200).json({ posts: postsWithDetails });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
