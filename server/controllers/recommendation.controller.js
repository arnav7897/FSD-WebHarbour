const { getHomeRecommendations } = require('../services/recommendation.service');

const getHomeRecommendationsHandler = async (req, res, next) => {
  try {
    const result = await getHomeRecommendations({ user: req.user, query: req.query });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getHomeRecommendationsHandler,
};
