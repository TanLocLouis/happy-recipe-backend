import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import userActionRoutes from "./routes/userAction.js";
import moderatorRoutes from "./routes/moderator.js";
import adminRoutes from "./routes/admin.js";
import profileRoutes from "./routes/profile.js";
import searchRoutes from "./routes/search.js";
import usersRoute from "./routes/users.js";
import aiRoutes from "./routes/ai.js";
import { testConnection } from "./config/db.js";

const app = express();

// app.use(helmet());
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin", // <-- FIX
    },
  })
);
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/health", async (req, res) => {
  try {
    await testConnection();
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "db_error" });
  }
});

BigInt.prototype.toJSON = function () {
  return this.toString();
};

app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/user-action", userActionRoutes);
app.use("/api/moderator", moderatorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/users", usersRoute);
app.use("/api/ai", aiRoutes);

app.use((req, res, next) => {
  res.status(404).json({ message: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
