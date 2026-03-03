const { getDeveloperOverview, getAppAnalytics } = require('../services/analytics.service');

const developerOverviewHandler = async (req, res, next) => {
  try {
    const result = await getDeveloperOverview(req.user.id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const developerAppAnalyticsHandler = async (req, res, next) => {
  try {
    const result = await getAppAnalytics({
      userId: req.user.id,
      appId: req.params.id,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  developerOverviewHandler,
  developerAppAnalyticsHandler,
};
