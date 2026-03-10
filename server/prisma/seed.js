const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../utlis/password');

const prisma = new PrismaClient();

const DEFAULT_ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'WebHarbour Admin';
const DEFAULT_ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@webharbour.local').toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

const categories = [
  {
    name: 'Productivity',
    slug: 'productivity',
    description: 'Task management, notes, and workflow tools.',
    order: 1,
  },
  {
    name: 'Developer Tools',
    slug: 'developer-tools',
    description: 'Coding, debugging, API, and automation tools.',
    order: 2,
  },
  {
    name: 'Design',
    slug: 'design',
    description: 'UI/UX, graphics, and creative tooling.',
    order: 3,
  },
  {
    name: 'Education',
    slug: 'education',
    description: 'Learning platforms, tutorials, and practice apps.',
    order: 4,
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'CRM, invoicing, operations, and team management.',
    order: 5,
  },
  {
    name: 'AI & Automation',
    slug: 'ai-automation',
    description: 'AI assistants and workflow automation apps.',
    order: 6,
  },
  {
    name: 'Utilities',
    slug: 'utilities',
    description: 'General-purpose helper apps and utilities.',
    order: 7,
  },
  {
    name: 'Security',
    slug: 'security',
    description: 'Privacy, authentication, and security tooling.',
    order: 8,
  },
];

const tags = [
  { name: 'Open Source', slug: 'open-source', description: 'Public source code available.' },
  { name: 'Free', slug: 'free', description: 'No payment required.' },
  { name: 'Premium', slug: 'premium', description: 'Paid offering with premium features.' },
  { name: 'Beginner Friendly', slug: 'beginner-friendly', description: 'Easy onboarding and usage.' },
  { name: 'Cross Platform', slug: 'cross-platform', description: 'Supports multiple operating systems.' },
  { name: 'Trending', slug: 'trending', description: 'Currently popular with users.' },
  { name: 'Verified Developer', slug: 'verified-developer', description: 'Built by verified developer.' },
  { name: 'Security Audited', slug: 'security-audited', description: 'Passed a security audit process.' },
];

const seedAdmin = async () => {
  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

  await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      name: DEFAULT_ADMIN_NAME,
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      name: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
    },
  });
};

const seedCategories = async () => {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        order: category.order,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
  }
};

const seedTags = async () => {
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {
        name: tag.name,
        description: tag.description,
      },
      create: tag,
    });
  }
};

const main = async () => {
  await seedAdmin();
  await seedCategories();
  await seedTags();
  console.log('Seed completed');
  console.log(`Admin email: ${DEFAULT_ADMIN_EMAIL}`);
};

main()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
