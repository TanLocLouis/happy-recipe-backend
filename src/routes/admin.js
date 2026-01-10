import { Router } from "express";
import { body, param } from "express-validator";
import {
	createModerator,
	listModerators,
	removeModerator,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/authorize.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

router.get("/moderators", listModerators);

router.post(
	"/moderators",
	[body("email").isEmail().withMessage("Valid email is required")],
	validateRequest,
	createModerator
);

router.delete(
	"/moderators/:userId",
	[param("userId").isString().notEmpty()],
	validateRequest,
	removeModerator
);

export default router;
