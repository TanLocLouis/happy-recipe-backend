import prisma from "../config/prisma.js";
import { randomBytes } from "crypto";
import path from "path";

function generatePostId() {
  return randomBytes(4).toString("hex"); // 8 hex chars -> fits `char(8)`
}

function mapIngredient(ing) {
  if (!ing) return null;
  return {
    ingredientId: ing.ingredient_id,
    itemOrder: ing.item_order,
    ingredientText: ing.ingredient_text,
  };
}

function mapStep(st) {
  if (!st) return null;
  return {
    stepNum: st.step_number,
    stepDesc: st.step_description,
    stepImgUrl: st.image_url ? process.env.SERVER_URL + st.image_url : null,
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
    coverImageUrl: process.env.SERVER_URL + post.cover_image_url,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    isDeleted: post.is_deleted,
    deletedAt: post.deleted_at,
    deletedBy: post.deleted_by,
    ingredients: Array.isArray(post.ingredients) ? post.ingredients.map(mapIngredient) : [],
    steps: Array.isArray(post.steps) ? post.steps.map(mapStep) : [],
  };
}

// New controller for handling post creation with file uploads
export async function createPostWithUpload(req, res) {
  // console.log('[DEBUG] createPostWithUpload called');
  // console.log('[DEBUG] req.body:', req.body);
  // console.log('[DEBUG] req.files:', req.files);
  const userId = req.userId;

  try {
    // Parse the JSON fields from form-data
    const { title, description, cookTime, servings, difficulty, steps: stepsData } = req.body;

    if (!title) return res.status(400).json({ message: "title is required" });

    // Normalize files array (multer.any())
    const files = Array.isArray(req.files) ? req.files : [];
    // console.log('[DEBUG] Number of files received:', files.length);
    // console.log('[DEBUG] Files details:', files.map(f => ({
    //   fieldname: f.fieldname,
    //   filename: f.filename,
    //   originalname: f.originalname,
    //   mimetype: f.mimetype,
    //   size: f.size
    // })));

    // Handle cover image
    let coverImageUrl = null;
    const coverFile = files.find((f) => f.fieldname === "coverImgFile");
    if (coverFile) {
      coverImageUrl = `/api/posts/files/${coverFile.filename}`;
    }

    // Parse steps - handle both JSON array and individual form fields
    let steps = [];

    if (Array.isArray(stepsData)) {
      // Frontend sent steps as JSON array
      steps = stepsData
        .filter((s) => s.stepDesc && s.stepDesc.trim())
        .map((s, idx) => {
          // Find matching step image by index
          const stepImageFile = files.find(
            (f) =>
              f.fieldname === `stepImgFiles[${idx}]` || f.fieldname === `steps[${idx}][stepImgFile]`
          );

          return {
            step_number: typeof s.stepNum === "number" ? s.stepNum : idx + 1,
            step_description: s.stepDesc,
            image_url: stepImageFile ? `/api/posts/files/${stepImageFile.filename}` : null,
          };
        });
    } else {
      // Fallback: parse from indexed form fields
      const stepsMap = new Map();

      for (const key in req.body) {
        const match = key.match(/^steps\[(\d+)\]\[(\w+)\]$/);
        if (match) {
          const index = parseInt(match[1]);
          const field = match[2];

          if (!stepsMap.has(index)) {
            stepsMap.set(index, {});
          }

          const step = stepsMap.get(index);
          if (field === "stepNum") {
            step.stepNumber = parseInt(req.body[key]);
          } else if (field === "stepDesc") {
            step.stepDescription = req.body[key];
          }
        }
      }

      // Handle step images for form field format
      const stepImageFiles = files.filter(
        (f) =>
          /^stepImgFiles(?:\[(\d+)\])?$/.test(f.fieldname) ||
          /^steps\[(\d+)\]\[stepImgFile\]$/.test(f.fieldname)
      );

      stepImageFiles.forEach((file) => {
        let index = null;
        const m1 = file.fieldname.match(/^stepImgFiles\[(\d+)\]$/);
        const m2 = file.fieldname.match(/^steps\[(\d+)\]\[stepImgFile\]$/);

        if (m1) index = parseInt(m1[1]);
        else if (m2) index = parseInt(m2[1]);

        if (index !== null) {
          if (!stepsMap.has(index)) stepsMap.set(index, {});
          stepsMap.get(index).image_url = `/api/posts/files/${file.filename}`;
        }
      });

      steps = Array.from(stepsMap.values())
        .filter((s) => s.stepDescription)
        .map((s) => ({
          step_number: s.stepNumber ?? 0,
          step_description: s.stepDescription,
          image_url: s.image_url || null,
        }));
    }

    console.log("[DEBUG] Parsed steps:", steps);
    console.log("[DEBUG] Cover image URL:", coverImageUrl);

    const postId = generatePostId();

    const created = await prisma.$transaction(async (tx) => {
      return await tx.posts.create({
        data: {
          post_id: postId,
          user_id: userId,
          title,
          description: description || null,
          cook_time: cookTime ? parseInt(cookTime) : null,
          servings: servings ? parseInt(servings) : null,
          difficulty: difficulty || null,
          cover_image_url: coverImageUrl,
          steps: steps.length > 0 ? { create: steps } : undefined,
        },
      });
    });

    return res.status(201).json({ postId: created.post_id });
    return res.status(201).json({});
  } catch (err) {
    console.error("Error creating post with upload:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
}

export async function createPost(req, res) {
  // userId is available from authenticate middleware
  const userId = req.userId;

  const { title, description, cookTime, servings, difficulty, coverImageUrl, ingredients, steps } =
    req.body;

  if (!title) return res.status(400).json({ message: "title is required" });

  const postId = generatePostId();

  try {
    const ingredientsCreate =
      Array.isArray(ingredients) && ingredients.length > 0
        ? ingredients
            .map((ing) => ({
              item_order: typeof ing.itemOrder === "number" ? ing.itemOrder : ing.item_order ?? 0,
              ingredient_text: ing.ingredientText || ing.text || ing.ingredient_text || null,
            }))
            .filter((i) => i.ingredient_text)
        : undefined;

    const stepsCreate =
      Array.isArray(steps) && steps.length > 0
        ? steps
            .map((st) => ({
              step_number: typeof st.stepNumber === "number" ? st.stepNumber : st.step_number ?? 0,
              step_description: st.stepDescription || st.description || st.step_description || null,
              image_url: st.image_url || st.image || null,
            }))
            .filter((s) => s.step_description)
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
          steps: stepsCreate ? { create: stepsCreate } : undefined,
        },
      });
    });

    return res.status(201).json({ postId: created.post_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getPostByID(req, res) {
  const { id } = req.params;
  try {
    const post = await prisma.posts.findFirst({
      where: { post_id: id, is_deleted: false },
      include: {
        users: {
          select: { user_id: true, username: true, display_name: true, profile_image_url: true },
        },
        ingredients: { orderBy: { item_order: "asc" } },
        steps: { orderBy: { step_number: "asc" } },
      },
    });

    if (!post) return res.status(404).json({ message: "Post not found" });

    // Aggregate reactions for this post
    const reactionsRows = await prisma.reactions.findMany({
      where: { post_id: id },
      select: { reaction_type: true },
    });

    const reactions = { like: 0, heart: 0, yum: 0 };
    for (const r of reactionsRows) {
      const type = r.reaction_type || "like";
      if (type === "like" || type === "heart" || type === "yum") {
        reactions[type]++;
      }
    }

    // For now, detailed view does not compute per-user actions; default values:
    const userActions = {
      userBookmark: false,
      userReaction: null,
    };

    // If userId is available from optional authentication middleware, compute per-user actions
    if (req.userId) {
      const currentUserId = req.userId;
      const [bookmarkRow, userReaction] = await Promise.all([
        prisma.bookmarks.findUnique({
          where: { unique_user_post_bookmark: { user_id: currentUserId, post_id: id } },
        }),
        prisma.reactions.findUnique({
          where: {
            user_id_post_id: { user_id: currentUserId, post_id: id },
          },
          select: { reaction_type: true },
        }),
      ]);
      userActions.userBookmark = !!bookmarkRow;
      userActions.userReaction = userReaction ? userReaction.reaction_type : null;
    }

    const detailedPost = {
      postId: post.post_id,
      title: post.title,
      coverImgUrl: process.env.SERVER_URL + post.cover_image_url || null,
      authorId: post.user_id,
      authorName: post.users ? post.users.display_name || post.users.username || null : null,
      authorImgUrl:
        post.users && post.users.profile_image_url
          ? process.env.SERVER_URL + post.users.profile_image_url
          : null,
      cookTime: post.cook_time ?? null,
      servings: post.servings ?? null,
      difficulty: post.difficulty || null,
      reactions,
      userActions,
      description: post.description || "",
      steps: Array.isArray(post.steps) ? post.steps.map(mapStep) : [],
    };

    console.log("[DEBUG] getPostByID detailedPost:", detailedPost);

    return res.status(200).json({ post: detailedPost });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function listPosts(req, res) {
  // const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  // const offset = parseInt(req.query.offset || '0', 10);

  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const offset = (page - 1) * limit;

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
        deleted_by: true,
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });
    const posts = rows.map((r) => ({
      postId: r.post_id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      cookTime: r.cook_time,
      servings: r.servings,
      difficulty: r.difficulty,
      coverImageUrl: process.env.SERVER_URL + r.cover_image_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isDeleted: r.is_deleted,
      deletedAt: r.deleted_at,
      deletedBy: r.deleted_by,
    }));
    return res.status(200).json({ posts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function discoverPosts(req, res) {
  const pageParamRaw = req.query.page;
  const page = Math.max(parseInt(pageParamRaw || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  const offset = (page - 1) * limit;
  try {
    // optional current user id from authentication middleware
    const currentUserId = req.userId || null;

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
        users: {
          select: { user_id: true, username: true, display_name: true, profile_image_url: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });

    const postIds = rows.map((r) => r.post_id);

    // fetch reactions for these posts
    const reactionsRows =
      postIds.length > 0
        ? await prisma.reactions.findMany({
            where: { post_id: { in: postIds } },
            select: { post_id: true, reaction_type: true, user_id: true },
          })
        : [];

    // build reactions map: { postId: { like: n, heart: n, yum: n, total: n } }
    const reactionsMap = {};
    for (const r of reactionsRows) {
      const pid = r.post_id;
      if (!reactionsMap[pid]) reactionsMap[pid] = { like: 0, heart: 0, yum: 0, total: 0 };
      const type = r.reaction_type || "like";
      if (!reactionsMap[pid][type]) reactionsMap[pid][type] = 0;
      reactionsMap[pid][type]++;
      reactionsMap[pid].total++;
    }

    // if current user specified, fetch their reactions and bookmarks
    let userReactions = [];
    let userBookmarks = [];
    if (currentUserId) {
      userReactions = await prisma.reactions.findMany({
        where: { post_id: { in: postIds }, user_id: currentUserId },
        select: { post_id: true, reaction_type: true },
      });
      userBookmarks = await prisma.bookmarks.findMany({
        where: { post_id: { in: postIds }, user_id: currentUserId },
        select: { post_id: true },
      });
    }

    const favSet = new Set(userBookmarks.map((f) => f.post_id));
    const userReactionMap = {};
    for (const ur of userReactions) userReactionMap[ur.post_id] = ur.reaction_type || null;

    const postList = rows.map((r) => {
      const author = r.users || null;
      const pid = r.post_id;
      const react = reactionsMap[pid] || { like: 0, heart: 0, yum: 0, total: 0 };

      // Shape user actions to match frontend `UserActions` type
      const userActions = {
        userBookmark: currentUserId ? favSet.has(pid) : false,
        userReaction: currentUserId ? userReactionMap[pid] || null : null,
      };

      return {
        postId: pid,
        title: r.title,
        coverImgUrl: process.env.SERVER_URL + r.cover_image_url || null,
        authorId: r.user_id,
        authorName: author ? author.display_name || author.username || null : null,
        authorImgUrl:
          author && author.profile_image_url
            ? process.env.SERVER_URL + author.profile_image_url
            : null,
        cookTime: r.cook_time ?? null,
        servings: r.servings ?? null,
        difficulty: r.difficulty || null,
        reactions: {
          like: react.like || 0,
          heart: react.heart || 0,
          yum: react.yum || 0,
        },
        userActions,
      };
    });

    return res.status(200).json({ postList });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getLatestPosts(req, res) {
  const limit = Math.min(parseInt(req.query.limit || "10", 10), 100);
  const offset = parseInt(req.query.offset || "0", 10);
  const includeDetails = req.query.details === "1" || req.query.details === "true";

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
          deleted_by: true,
        },
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
      });
      const posts = rows.map((r) => ({
        postId: r.post_id,
        userId: r.user_id,
        title: r.title,
        description: r.description,
        cookTime: r.cook_time,
        servings: r.servings,
        difficulty: r.difficulty,
        coverImageUrl: process.env.SERVER_URL + r.cover_image_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        isDeleted: r.is_deleted,
        deletedAt: r.deleted_at,
        deletedBy: r.deleted_by,
      }));
      return res.status(200).json({ posts });
    }

    const postsRaw = await prisma.posts.findMany({
      where: { is_deleted: false },
      include: {
        ingredients: { orderBy: { item_order: "asc" } },
        steps: { orderBy: { step_number: "asc" } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });

    const posts = postsRaw.map(mapPost);

    return res.status(200).json({ posts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get paginated comments for a post
export async function getPostComments(req, res) {
  console.log("[DEBUG] getPostComments called");
  const { id } = req.params; // postId
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "5", 10), 1), 50);
  const offset = (page - 1) * limit;

  try {
    // Ensure post exists and not deleted
    const post = await prisma.posts.findFirst({ where: { post_id: id, is_deleted: false } });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const [comments, total] = await Promise.all([
      prisma.comments.findMany({
        where: { post_id: id, is_deleted: false, parent_comment_id: null },
        include: {
          users: {
            select: { user_id: true, username: true, display_name: true, profile_image_url: true },
          },
        },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.comments.count({ where: { post_id: id, is_deleted: false } }),
    ]);

    // Compute reply counts for these comments
    const commentIds = comments.map((c) => c.comment_id);
    const replyCounts =
      commentIds.length > 0
        ? await prisma.comments.groupBy({
            by: ["parent_comment_id"],
            where: { parent_comment_id: { in: commentIds } },
            _count: { parent_comment_id: true },
          })
        : [];
    const replyCountMap = new Map();
    for (const rc of replyCounts) {
      // parent_comment_id is BigInt; convert to string key for map
      replyCountMap.set(String(rc.parent_comment_id), rc._count.parent_comment_id);
    }

    const items = comments.map((c) => ({
      commentId: String(c.comment_id),
      postId: c.post_id,
      userId: c.user_id, // stored as string in schema; FE expected number but schema uses CHAR(36)
      userName: c.users?.display_name || c.users?.username || "",
      userImgUrl: c.users?.profile_image_url
        ? process.env.SERVER_URL + c.users.profile_image_url
        : null,
      content: c.comment_text,
      createdAt: c.created_at,
      parentCommentID: c.parent_comment_id ? String(c.parent_comment_id) : null,
      replyCount: replyCountMap.get(String(c.comment_id)) || 0,
    }));

    return res.status(200).json({
      comments: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createPostComment(req, res) {
  console.log("[DEBUG] createPostComment called");
  const { id } = req.params; // postId
  const userId = req.user.userId;
  const { content, parentCommentID } = req.body;

  try {
    // Ensure post exists and not deleted
    const post = await prisma.posts.findFirst({ where: { post_id: id, is_deleted: false } });
    if (!post) return res.status(404).json({ message: "Post not found" });

    // If parentCommentID is provided, ensure it exists and belongs to the same post
    if (parentCommentID) {
      const parentComment = await prisma.comments.findFirst({
        where: { comment_id: BigInt(parentCommentID), post_id: id, is_deleted: false },
      });
      if (!parentComment) {
        return res.status(400).json({ message: "Invalid parent comment ID" });
      }
    }

    const created = await prisma.comments.create({
      data: {
        post_id: id,
        user_id: userId,
        comment_text: content,
        parent_comment_id: parentCommentID ? BigInt(parentCommentID) : null,
        created_at: new Date(),
      },
    });

    console.log("[DEBUG] Created comment:", created);

    return res.status(201).json({ commentId: String(created.comment_id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
