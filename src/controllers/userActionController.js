import prisma from "../config/prisma.js";

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
    // console.log("Received uploadUserAction request:", {
    //   action,
    //   postId,
    //   newReaction,
    //   newBookmark,
    // });

    if (!action || !postId) {
      return res.status(400).json({ message: "action and postId are required" });
    }

    if (!["reaction", "bookmark"].includes(action)) {
      return res.status(400).json({ message: 'action must be either "reaction" or "bookmark"' });
    }

    // Verify post exists
    const post = await prisma.posts.findFirst({
      where: { post_id: postId, is_deleted: false },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (action === "reaction") {
      // Handle reaction action
      const reaction = newReaction;

      // Validate reaction type if provided
      if (reaction !== null && !["like", "heart", "yum"].includes(reaction)) {
        return res
          .status(400)
          .json({ message: "Invalid reaction type. Must be like, heart, yum, or null" });
      }

      // Check if user already has a reaction for this post
      const existingReaction = await prisma.reactions.findUnique({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId,
          },
        },
      });

      if (reaction === null) {
        // Remove reaction if it exists
        if (existingReaction) {
          await prisma.reactions.delete({
            where: {
              user_id_post_id: {
                user_id: userId,
                post_id: postId,
              },
            },
          });
        }
        return res.status(200).json({ message: "Reaction removed successfully" });
      } else {
        // Upsert reaction (create or update)
        await prisma.reactions.upsert({
          where: {
            user_id_post_id: {
              user_id: userId,
              post_id: postId,
            },
          },
          update: {
            reaction_type: reaction,
          },
          create: {
            user_id: userId,
            post_id: postId,
            reaction_type: reaction,
          },
        });
        return res.status(200).json({ message: "Reaction updated successfully" });
      }
    } else if (action === "bookmark") {
      // Handle bookmark action
      if (typeof newBookmark !== "boolean") {
        return res.status(400).json({ message: "newBookmark must be a boolean value" });
      }

      // Check if bookmark already exists
      const existingBookmark = await prisma.bookmarks.findUnique({
        where: { unique_user_post_bookmark: { user_id: userId, post_id: postId } },
      });

      if (newBookmark) {
        // Add bookmark if it doesn't exist
        if (!existingBookmark) {
          console.log("[DEBUG] Creating new bookmark");
          await prisma.bookmarks.create({ data: { user_id: userId, post_id: postId } });
        }
        return res.status(200).json({ message: "Bookmark added successfully" });
      } else {
        console.log("Removing bookmark if exists");
        // Remove bookmark if it exists
        if (existingBookmark) {
          await prisma.bookmarks.delete({
            where: { unique_user_post_bookmark: { user_id: userId, post_id: postId } },
          });
        }
        return res.status(200).json({ message: "Bookmark removed successfully" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
