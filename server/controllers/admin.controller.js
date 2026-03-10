const {
  approveApp,
  rejectApp,
  suspendApp,
  unsuspendApp,
} = require('../services/moderation.service');
const {
  listDeveloperRequests,
  approveDeveloperRequest,
  rejectDeveloperRequest,
} = require('../services/auth.service');

const approveAppHandler = async (req, res, next) => {
  try {
    const app = await approveApp({
      appId: req.params.id,
      moderatorId: req.user.id,
      note: req.body && req.body.note,
    });
    return res.json(app);
  } catch (err) {
    return next(err);
  }
};

const rejectAppHandler = async (req, res, next) => {
  try {
    const app = await rejectApp({
      appId: req.params.id,
      moderatorId: req.user.id,
      moderationNote: req.body && (req.body.moderationNote || req.body.note),
    });
    return res.json(app);
  } catch (err) {
    return next(err);
  }
};

const suspendAppHandler = async (req, res, next) => {
  try {
    const app = await suspendApp({
      appId: req.params.id,
      moderatorId: req.user.id,
      reason: req.body && req.body.reason,
    });
    return res.json(app);
  } catch (err) {
    return next(err);
  }
};

const unsuspendAppHandler = async (req, res, next) => {
  try {
    const app = await unsuspendApp({
      appId: req.params.id,
      moderatorId: req.user.id,
      note: req.body && req.body.note,
    });
    return res.json(app);
  } catch (err) {
    return next(err);
  }
};

const listDeveloperRequestsHandler = async (req, res, next) => {
  try {
    const result = await listDeveloperRequests(req.query);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const approveDeveloperRequestHandler = async (req, res, next) => {
  try {
    const result = await approveDeveloperRequest(Number(req.params.userId));
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const rejectDeveloperRequestHandler = async (req, res, next) => {
  try {
    const result = await rejectDeveloperRequest(Number(req.params.userId));
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  approveAppHandler,
  rejectAppHandler,
  suspendAppHandler,
  unsuspendAppHandler,
  listDeveloperRequestsHandler,
  approveDeveloperRequestHandler,
  rejectDeveloperRequestHandler,
};
