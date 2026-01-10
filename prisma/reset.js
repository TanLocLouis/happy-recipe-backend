import prisma from '../src/config/prisma.js';

/**
 * Script to delete all data from all tables.
 * Tables are deleted in order to respect foreign key constraints.
 * Run with: node prisma/reset.js
 */
async function main() {
  console.log('🗑️  Deleting all data from database...\n');

  await prisma.$connect();

  // Delete in order respecting foreign key constraints (children first)
  // Tables with no dependencies on other tables come last

  // 1. Tables that depend on comments
  console.log('Deleting post_moderation...');
  await prisma.post_moderation.deleteMany();

  // 2. Tables that depend on posts
  console.log('Deleting notifications...');
  await prisma.notifications.deleteMany();

  console.log('Deleting comments...');
  await prisma.comments.deleteMany();

  console.log('Deleting reactions...');
  await prisma.reactions.deleteMany();

  console.log('Deleting bookmarks...');
  await prisma.bookmarks.deleteMany();

  console.log('Deleting favorites...');
  await prisma.favorites.deleteMany();

  console.log('Deleting ingredients...');
  await prisma.ingredients.deleteMany();

  console.log('Deleting steps...');
  await prisma.steps.deleteMany();

  console.log('Deleting post_edit_history...');
  await prisma.post_edit_history.deleteMany();

  // 3. Tables that depend on users
  console.log('Deleting user_moderation...');
  await prisma.user_moderation.deleteMany();

  console.log('Deleting fa (2FA)...');
  await prisma.fa.deleteMany();

  // 4. Main tables
  console.log('Deleting posts...');
  await prisma.posts.deleteMany();

  console.log('Deleting users...');
  await prisma.users.deleteMany();

  // 5. Standalone tables
  console.log('Deleting dashboard_stats...');
  await prisma.dashboard_stats.deleteMany();

  console.log('\n✅ All data deleted successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Reset error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
