const { createReport, listReports, resolveReport } = require('../services/report.service');

const createReportHandler = async (req, res, next) => {
  try {
    const report = await createReport({
      userId: req.user.id,
      body: req.body,
    });
    return res.status(201).json(report);
  } catch (err) {
    return next(err);
  }
};

const listReportsHandler = async (req, res, next) => {
  try {
    const result = await listReports(req.query);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const resolveReportHandler = async (req, res, next) => {
  try {
    const report = await resolveReport({
      reportId: req.params.id,
      moderatorId: req.user.id,
      body: req.body,
    });
    return res.json(report);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createReportHandler,
  listReportsHandler,
  resolveReportHandler,
};
