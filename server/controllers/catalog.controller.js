const {
  listCategories,
  createCategory,
  listTags,
  createTag,
} = require('../services/catalog.service');

const listCategoriesHandler = async (req, res, next) => {
  try {
    const items = await listCategories();
    return res.json(items);
  } catch (err) {
    return next(err);
  }
};

const createCategoryHandler = async (req, res, next) => {
  try {
    const created = await createCategory(req.body);
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

const listTagsHandler = async (req, res, next) => {
  try {
    const items = await listTags();
    return res.json(items);
  } catch (err) {
    return next(err);
  }
};

const createTagHandler = async (req, res, next) => {
  try {
    const created = await createTag(req.body);
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listCategoriesHandler,
  createCategoryHandler,
  listTagsHandler,
  createTagHandler,
};
