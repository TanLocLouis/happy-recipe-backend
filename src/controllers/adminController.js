import prisma from "../config/prisma.js";

/**
 * Get admin dashboard stats: posts, comments, new accounts by day/week/month/year
 */
export async function getStats(req, res) {
	try {
		const now = new Date();

		// Start of day (midnight today)
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		// Start of week (Monday)
		const dayOfWeek = now.getDay();
		const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);

		// Start of month
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		// Start of year
		const startOfYear = new Date(now.getFullYear(), 0, 1);

		// Count posts
		const [postsDay, postsWeek, postsMonth, postsYear] = await Promise.all([
			prisma.posts.count({ where: { created_at: { gte: startOfDay }, is_deleted: false } }),
			prisma.posts.count({ where: { created_at: { gte: startOfWeek }, is_deleted: false } }),
			prisma.posts.count({ where: { created_at: { gte: startOfMonth }, is_deleted: false } }),
			prisma.posts.count({ where: { created_at: { gte: startOfYear }, is_deleted: false } }),
		]);

		// Count comments
		const [commentsDay, commentsWeek, commentsMonth, commentsYear] = await Promise.all([
			prisma.comments.count({ where: { created_at: { gte: startOfDay }, is_deleted: false } }),
			prisma.comments.count({ where: { created_at: { gte: startOfWeek }, is_deleted: false } }),
			prisma.comments.count({ where: { created_at: { gte: startOfMonth }, is_deleted: false } }),
			prisma.comments.count({ where: { created_at: { gte: startOfYear }, is_deleted: false } }),
		]);

		// Count new accounts
		const [accountsDay, accountsWeek, accountsMonth, accountsYear] = await Promise.all([
			prisma.users.count({ where: { created_at: { gte: startOfDay } } }),
			prisma.users.count({ where: { created_at: { gte: startOfWeek } } }),
			prisma.users.count({ where: { created_at: { gte: startOfMonth } } }),
			prisma.users.count({ where: { created_at: { gte: startOfYear } } }),
		]);

		return res.status(200).json({
			posts: { day: postsDay, week: postsWeek, month: postsMonth, year: postsYear },
			comments: { day: commentsDay, week: commentsWeek, month: commentsMonth, year: commentsYear },
			newAccounts: { day: accountsDay, week: accountsWeek, month: accountsMonth, year: accountsYear },
		});
	} catch (err) {
		console.error("getStats error", err);
		return res.status(500).json({ message: "Internal server error" });
	}
}

export async function listModerators(req, res) {
	try {
		const moderators = await prisma.users.findMany({
			where: { role: "MODERATOR" },
			select: {
				user_id: true,
				username: true,
				email: true,
				display_name: true,
				profile_image_url: true,
				created_at: true,
				is_active: true,
			},
			orderBy: { created_at: "desc" },
		});

		const payload = moderators.map((mod) => ({
			userId: mod.user_id,
			username: mod.username,
			email: mod.email,
			displayName: mod.display_name,
			profileImageUrl: mod.profile_image_url,
			createdAt: mod.created_at,
			isActive: mod.is_active,
		}));

		return res.status(200).json({ moderators: payload });
	} catch (err) {
		console.error("listModerators error", err);
		return res.status(500).json({ message: "Internal server error" });
	}
}

export async function createModerator(req, res) {
	const email = (req.body.email || "").trim().toLowerCase();

	try {
		const user = await prisma.users.findUnique({
			where: { email },
			select: { user_id: true, role: true, is_active: true },
		});

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		if (user.role === "ADMIN") {
			return res.status(400).json({ message: "Cannot modify admin role" });
		}

		if (user.role === "MODERATOR") {
			return res.status(400).json({ message: "User is already a moderator" });
		}

		const updated = await prisma.users.update({
			where: { user_id: user.user_id },
			data: { role: "MODERATOR" },
			select: {
				user_id: true,
				username: true,
				email: true,
				display_name: true,
				profile_image_url: true,
				created_at: true,
				is_active: true,
				role: true,
			},
		});

		return res.status(201).json({
			message: "Moderator added successfully",
			moderator: {
				userId: updated.user_id,
				username: updated.username,
				email: updated.email,
				displayName: updated.display_name,
				profileImageUrl: updated.profile_image_url,
				createdAt: updated.created_at,
				isActive: updated.is_active,
				role: updated.role,
			},
		});
	} catch (err) {
		console.error("createModerator error", err);
		return res.status(500).json({ message: "Internal server error" });
	}
}

export async function removeModerator(req, res) {
	const { userId } = req.params;

	try {
		const user = await prisma.users.findUnique({
			where: { user_id: userId },
			select: { user_id: true, role: true },
		});

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		if (user.role === "ADMIN") {
			return res.status(400).json({ message: "Cannot modify admin role" });
		}

		if (user.role !== "MODERATOR") {
			return res.status(400).json({ message: "User is not a moderator" });
		}

		await prisma.users.update({
			where: { user_id: userId },
			data: { role: "USER" },
		});

		return res.status(200).json({
			message: "Moderator removed successfully",
			userId,
		});
	} catch (err) {
		console.error("removeModerator error", err);
		return res.status(500).json({ message: "Internal server error" });
	}
}
