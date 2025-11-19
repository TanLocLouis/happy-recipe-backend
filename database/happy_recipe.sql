-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 19, 2025 at 10:48 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `happy_recipe`
--

-- --------------------------------------------------------

--
-- Table structure for table `2fa`
--

CREATE TABLE `2fa` (
  `user_id` char(36) NOT NULL,
  `temp_token` varchar(255) NOT NULL,
  `code` varchar(20) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `admin_id` bigint(20) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `comment_id` bigint(20) NOT NULL,
  `post_id` char(8) NOT NULL,
  `user_id` char(36) NOT NULL,
  `comment_text` text NOT NULL,
  `parent_comment_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dashboard_stats`
--

CREATE TABLE `dashboard_stats` (
  `stat_id` bigint(20) NOT NULL,
  `stat_date` date NOT NULL,
  `total_users` int(11) DEFAULT 0,
  `new_users_today` int(11) DEFAULT 0,
  `total_posts` int(11) DEFAULT 0,
  `new_posts_today` int(11) DEFAULT 0,
  `total_comments` int(11) DEFAULT 0,
  `total_reactions` int(11) DEFAULT 0,
  `active_bans` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `favorites`
--

CREATE TABLE `favorites` (
  `favorite_id` bigint(20) NOT NULL,
  `user_id` char(36) NOT NULL,
  `post_id` char(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ingredients`
--

CREATE TABLE `ingredients` (
  `ingredient_id` bigint(20) NOT NULL,
  `post_id` char(8) NOT NULL,
  `item_order` int(11) NOT NULL,
  `ingredient_text` varchar(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `moderators`
--

CREATE TABLE `moderators` (
  `moderator_id` bigint(20) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `posts`
--

CREATE TABLE `posts` (
  `post_id` char(8) NOT NULL,
  `user_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `cook_time` int(11) DEFAULT NULL,
  `servings` int(11) DEFAULT NULL,
  `difficulty` enum('easy','medium','hard') DEFAULT NULL,
  `cover_image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post_edit_history`
--

CREATE TABLE `post_edit_history` (
  `history_id` bigint(20) NOT NULL,
  `post_id` char(8) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `cook_time` int(11) DEFAULT NULL,
  `servings` int(11) DEFAULT NULL,
  `difficulty` enum('easy','medium','hard') DEFAULT NULL,
  `edited_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post_moderation`
--

CREATE TABLE `post_moderation` (
  `action_id` bigint(20) NOT NULL,
  `moderator_id` bigint(20) DEFAULT NULL,
  `admin_id` bigint(20) DEFAULT NULL,
  `target_type` enum('post','comment') NOT NULL,
  `target_post_id` char(8) DEFAULT NULL,
  `target_comment_id` bigint(20) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reactions`
--

CREATE TABLE `reactions` (
  `reaction_id` bigint(20) NOT NULL,
  `post_id` char(8) NOT NULL,
  `user_id` char(36) NOT NULL,
  `reaction_type` enum('like','heart','yum') DEFAULT 'like',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `steps`
--

CREATE TABLE `steps` (
  `step_id` bigint(20) NOT NULL,
  `post_id` char(8) NOT NULL,
  `step_number` int(11) NOT NULL,
  `step_description` text NOT NULL,
  `image_url` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` char(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `is_verified` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_moderation`
--

CREATE TABLE `user_moderation` (
  `action_id` bigint(20) NOT NULL,
  `user_id` char(36) NOT NULL,
  `moderator_id` bigint(20) DEFAULT NULL,
  `admin_id` bigint(20) DEFAULT NULL,
  `action_type` enum('warning','ban') NOT NULL,
  `reason` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `2fa`
--
ALTER TABLE `2fa`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `idx_2fa_expires_at` (`expires_at`);

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`comment_id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_parent_comment` (`parent_comment_id`);

--
-- Indexes for table `dashboard_stats`
--
ALTER TABLE `dashboard_stats`
  ADD PRIMARY KEY (`stat_id`),
  ADD UNIQUE KEY `stat_date` (`stat_date`),
  ADD KEY `idx_stat_date` (`stat_date`);

--
-- Indexes for table `favorites`
--
ALTER TABLE `favorites`
  ADD PRIMARY KEY (`favorite_id`),
  ADD UNIQUE KEY `unique_user_post_favorite` (`user_id`,`post_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_post_id` (`post_id`);

--
-- Indexes for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD PRIMARY KEY (`ingredient_id`),
  ADD KEY `idx_post_id` (`post_id`);

--
-- Indexes for table `moderators`
--
ALTER TABLE `moderators`
  ADD PRIMARY KEY (`moderator_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`post_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_deleted` (`is_deleted`);

--
-- Indexes for table `post_edit_history`
--
ALTER TABLE `post_edit_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_edited_at` (`edited_at`);

--
-- Indexes for table `post_moderation`
--
ALTER TABLE `post_moderation`
  ADD PRIMARY KEY (`action_id`),
  ADD KEY `moderator_id` (`moderator_id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `idx_target_post` (`target_post_id`),
  ADD KEY `idx_target_comment` (`target_comment_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `reactions`
--
ALTER TABLE `reactions`
  ADD PRIMARY KEY (`reaction_id`),
  ADD UNIQUE KEY `unique_user_post_reaction` (`user_id`,`post_id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `steps`
--
ALTER TABLE `steps`
  ADD PRIMARY KEY (`step_id`),
  ADD KEY `idx_post_id` (`post_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `user_moderation`
--
ALTER TABLE `user_moderation`
  ADD PRIMARY KEY (`action_id`),
  ADD KEY `moderator_id` (`moderator_id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `admin_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `comment_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dashboard_stats`
--
ALTER TABLE `dashboard_stats`
  MODIFY `stat_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `favorites`
--
ALTER TABLE `favorites`
  MODIFY `favorite_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ingredients`
--
ALTER TABLE `ingredients`
  MODIFY `ingredient_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `moderators`
--
ALTER TABLE `moderators`
  MODIFY `moderator_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `post_edit_history`
--
ALTER TABLE `post_edit_history`
  MODIFY `history_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `post_moderation`
--
ALTER TABLE `post_moderation`
  MODIFY `action_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reactions`
--
ALTER TABLE `reactions`
  MODIFY `reaction_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `steps`
--
ALTER TABLE `steps`
  MODIFY `step_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_moderation`
--
ALTER TABLE `user_moderation`
  MODIFY `action_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `2fa`
--
ALTER TABLE `2fa`
  ADD CONSTRAINT `2fa_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE;

--
-- Constraints for table `favorites`
--
ALTER TABLE `favorites`
  ADD CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE;

--
-- Constraints for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD CONSTRAINT `ingredients_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE;

--
-- Constraints for table `posts`
--
ALTER TABLE `posts`
  ADD CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `post_edit_history`
--
ALTER TABLE `post_edit_history`
  ADD CONSTRAINT `post_edit_history_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE;

--
-- Constraints for table `post_moderation`
--
ALTER TABLE `post_moderation`
  ADD CONSTRAINT `post_moderation_ibfk_1` FOREIGN KEY (`moderator_id`) REFERENCES `moderators` (`moderator_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `post_moderation_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`admin_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `post_moderation_ibfk_3` FOREIGN KEY (`target_post_id`) REFERENCES `posts` (`post_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `post_moderation_ibfk_4` FOREIGN KEY (`target_comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE SET NULL;

--
-- Constraints for table `reactions`
--
ALTER TABLE `reactions`
  ADD CONSTRAINT `reactions_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `steps`
--
ALTER TABLE `steps`
  ADD CONSTRAINT `steps_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_moderation`
--
ALTER TABLE `user_moderation`
  ADD CONSTRAINT `user_moderation_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_moderation_ibfk_2` FOREIGN KEY (`moderator_id`) REFERENCES `moderators` (`moderator_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `user_moderation_ibfk_3` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`admin_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
