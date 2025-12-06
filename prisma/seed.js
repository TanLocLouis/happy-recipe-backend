import { randomUUID } from 'crypto';
import prisma from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/password.js';

// Compatibility: if client hasn't been generated with `bookmarks` yet,
// fall back to `favorites` to avoid runtime errors during seeding.
const bookmarksClient = prisma.bookmarks ?? prisma.favorites;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Starting seed...');

  await prisma.$connect();

  // Base users (kept deterministic-ish) + generate extras
  const baseUsers = [
    { username: 'alice', email: '23120057@student.hcmus.edu.vn', display_name: 'Alice', password: 'password123' },
    { username: 'bob', email: 'bob@example.com', display_name: 'Bob', password: 'password123' },
    { username: 'carol', email: 'carol@example.com', display_name: 'Carol', password: 'password123' }
  ];

  const extraCount = 12; // generate 12 additional users for richer data
  for (let i = 1; i <= extraCount; i++) {
    baseUsers.push({ username: `user${i}`, email: `user${i}@example.com`, display_name: `User ${i}`, password: 'password123' });
  }

  const users = [];
  for (const u of baseUsers) {
    const id = randomUUID();
    const pwHash = await hashPassword(u.password);
    const up = await prisma.users.upsert({
      where: { email: u.email },
      update: {
        username: u.username,
        display_name: u.display_name,
        password_hash: pwHash
      },
      create: {
        user_id: id,
        username: u.username,
        email: u.email,
        password_hash: pwHash,
        display_name: u.display_name
      }
    });
    users.push(up);
  }

  // sample recipe fragments to mix-and-match
  const titles = [
    'Spicy Chickpea Stew', 'Lemon Garlic Salmon', 'Coconut Curry', 'Banana Pancakes', 'Mushroom Risotto',
    'Greek Salad', 'Chocolate Mug Cake', 'Honey Glazed Chicken', 'Quinoa Buddha Bowl', 'Beef Stir Fry'
  ];
  const ingredientsPool = ['Salt', 'Pepper', 'Olive oil', 'Onion', 'Garlic', 'Tomato', 'Basil', 'Lemon', 'Chicken', 'Beef', 'Rice', 'Pasta', 'Coconut milk', 'Mushrooms', 'Spinach', 'Avocado', 'Eggs', 'Flour', 'Sugar'];
  const stepActions = ['Chop', 'Mix', 'Cook', 'Bake', 'Saute', 'Fry', 'Simmer', 'Blend', 'Season', 'Rest'];

  const createdPosts = [];

  // Generate multiple posts per user
  const postsPerUser = 3;
  for (const user of users) {
    for (let pIdx = 0; pIdx < postsPerUser; pIdx++) {
      const title = `${pick(titles)} by ${user.username} (${pIdx + 1})`;
      const description = `Delicious ${title.toLowerCase()} prepared by ${user.display_name || user.username}.`;
      const cook_time = randInt(5, 90);
      const servings = randInt(1, 6);
      const difficulty = pick(['easy', 'medium', 'hard']);
      const postId = randomUUID();

      // ingredients
      const ingCount = randInt(2, 6);
      const ingredients = [];
      for (let i = 0; i < ingCount; i++) {
        ingredients.push({ item_order: i + 1, ingredient_text: pick(ingredientsPool), ingredient_unit: `${randInt(1, 500)}g` });
      }

      // steps
      const stepCount = randInt(2, 6);
      const steps = [];
      for (let s = 0; s < stepCount; s++) {
        steps.push({ step_number: s + 1, step_description: `${pick(stepActions)} the ingredients and ${pick(['serve', 'enjoy', 'let cool', 'garnish'])}.` });
      }

      const created = await prisma.posts.create({
        data: {
          post_id: postId,
          user_id: user.user_id,
          title,
          description,
          cook_time,
          servings,
          difficulty,
          cover_image_url: 'http://localhost:4000/api/posts/files/sample.jpg',
          ingredients: { create: ingredients },
          steps: { create: steps }
        }
      });
      createdPosts.push(created);
    }
  }

  console.log(`Created ${createdPosts.length} posts for ${users.length} users.`);

  // Create comments: for a subset of posts create several comments from random users
  const commentsCreated = [];
  for (const post of createdPosts) {
    const commentCount = randInt(0, 5);
    for (let c = 0; c < commentCount; c++) {
      const commenter = pick(users);
      try {
        const comm = await prisma.comments.create({
          data: {
            post_id: post.post_id,
            user_id: commenter.user_id,
            comment_text: `${pick(['Great', 'Love', 'Nice', 'Tasty', 'Amazing'])} recipe!`,
            parent_comment_id: null
          }
        });
        commentsCreated.push(comm);
      } catch (e) {
        // ignore
      }
    }
  }

  console.log(`Created ${commentsCreated.length} comments.`);

  // Create reactions for posts by random users
  const reactionTypes = ['like', 'heart', 'yum'];
  let reactionsCount = 0;
  for (const post of createdPosts) {
    const numReacts = randInt(0, Math.min(6, users.length));
    const shuffled = users.slice().sort(() => 0.5 - Math.random()).slice(0, numReacts);
    for (const u of shuffled) {
      const type = pick(reactionTypes);
      try {
        await prisma.reactions.upsert({
          where: { user_id_post_id: { user_id: u.user_id, post_id: post.post_id } },
          update: { reaction_type: type },
          create: { user_id: u.user_id, post_id: post.post_id, reaction_type: type }
        });
        reactionsCount++;
      } catch (e) {
        // ignore
      }
    }
  }

  console.log(`Created/updated ${reactionsCount} reactions.`);

  // Create bookmarks/favorites randomly
  let bookmarksCount = 0;
  for (const user of users) {
    // each user bookmarks up to 10 posts
    const bmCount = randInt(0, Math.min(10, createdPosts.length));
    const shuffled = createdPosts.slice().sort(() => 0.5 - Math.random()).slice(0, bmCount);
    for (const p of shuffled) {
      try {
        await bookmarksClient.create({ data: { user_id: user.user_id, post_id: p.post_id } });
        bookmarksCount++;
      } catch (e) {
        // ignore duplicates or foreign key issues
      }
    }
  }

  console.log(`Created ${bookmarksCount} bookmarks/favorites.`);

  console.log('Seed finished.');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
