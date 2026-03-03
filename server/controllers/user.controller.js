const { listMyFavorites } = require('../services/engagement.service');

const listMyFavoritesHandler = async (req, res, next) => {
  try {
    const items = await listMyFavorites(req.user.id);
    return res.json(items);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listMyFavoritesHandler,
};
