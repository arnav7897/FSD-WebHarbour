const {
  createReview,
  listReviews,
  updateReview,
  deleteReview,
} = require('../services/review.service');

const createReviewHandler = async (req, res, next) => {
  try {
    const review = await createReview({
      appId: req.params.appId,
      userId: req.user.id,
      body: req.body,
    });
    return res.status(201).json(review);
  } catch (err) {
    return next(err);
  }
};

const listReviewsHandler = async (req, res, next) => {
  try {
    const reviews = await listReviews(req.params.appId);
    return res.json(reviews);
  } catch (err) {
    return next(err);
  }
};

const updateReviewHandler = async (req, res, next) => {
  try {
    const review = await updateReview({
      appId: req.params.appId,
      reviewId: req.params.reviewId,
      user: req.user,
      body: req.body,
    });
    return res.json(review);
  } catch (err) {
    return next(err);
  }
};

const deleteReviewHandler = async (req, res, next) => {
  try {
    const result = await deleteReview({
      appId: req.params.appId,
      reviewId: req.params.reviewId,
      user: req.user,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createReviewHandler,
  listReviewsHandler,
  updateReviewHandler,
  deleteReviewHandler,
};
