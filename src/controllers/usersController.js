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
