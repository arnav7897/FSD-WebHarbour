const prisma = require('../config/db');

const makeHttpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseRating = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
};

const ensureAppExists = async (appId) => {
  const parsedAppId = parsePositiveInt(appId);
  if (!parsedAppId) throw makeHttpError('Invalid app id', 400);

  const app = await prisma.app.findUnique({
    where: { id: parsedAppId },
    select: { id: true },
  });

  if (!app) throw makeHttpError('App not found', 404);
  return parsedAppId;
};

const createReview = async ({ appId, userId, body = {} }) => {
  const parsedAppId = await ensureAppExists(appId);
  const rating = parseRating(body.rating);
  if (!rating) throw makeHttpError('rating must be an integer between 1 and 5', 400);

  const title = body.title !== undefined && body.title !== null ? String(body.title).trim() : null;
  const comment = body.comment !== undefined && body.comment !== null ? String(body.comment).trim() : null;

  try {
    return await prisma.review.create({
      data: {
        appId: parsedAppId,
        userId,
        rating,
        title: title || null,
        comment: comment || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  } catch (err) {
    if (err.code === 'P2002') throw makeHttpError('You already reviewed this app', 409);
    throw err;
  }
};

const listReviews = async (appId) => {
  const parsedAppId = await ensureAppExists(appId);
  return prisma.review.findMany({
    where: { appId: parsedAppId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });
};

const updateReview = async ({ appId, reviewId, user, body = {} }) => {
  const parsedAppId = await ensureAppExists(appId);
  const parsedReviewId = parsePositiveInt(reviewId);
  if (!parsedReviewId) throw makeHttpError('Invalid review id', 400);

  const review = await prisma.review.findUnique({ where: { id: parsedReviewId } });
  if (!review || review.appId !== parsedAppId) throw makeHttpError('Review not found', 404);
  if (review.userId !== user.id) throw makeHttpError('You can only edit your own review', 403);

  const data = {};

  if (body.rating !== undefined) {
    const rating = parseRating(body.rating);
    if (!rating) throw makeHttpError('rating must be an integer between 1 and 5', 400);
    data.rating = rating;
  }

  if (body.title !== undefined) {
    const title = body.title === null ? null : String(body.title).trim();
    data.title = title || null;
  }

  if (body.comment !== undefined) {
    const comment = body.comment === null ? null : String(body.comment).trim();
    data.comment = comment || null;
  }

  if (!Object.keys(data).length) {
    throw makeHttpError('Provide at least one field to update: rating, title, comment', 400);
  }

  data.isEdited = true;
  data.editedAt = new Date();

  return prisma.review.update({
    where: { id: parsedReviewId },
    data,
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });
};

const deleteReview = async ({ appId, reviewId, user }) => {
  const parsedAppId = await ensureAppExists(appId);
  const parsedReviewId = parsePositiveInt(reviewId);
  if (!parsedReviewId) throw makeHttpError('Invalid review id', 400);

  const review = await prisma.review.findUnique({ where: { id: parsedReviewId } });
  if (!review || review.appId !== parsedAppId) throw makeHttpError('Review not found', 404);

  const isOwner = review.userId === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAdmin) throw makeHttpError('You can only delete your own review', 403);

  await prisma.review.delete({ where: { id: parsedReviewId } });
  return { message: 'Review deleted' };
};

module.exports = {
  createReview,
  listReviews,
  updateReview,
  deleteReview,
};
