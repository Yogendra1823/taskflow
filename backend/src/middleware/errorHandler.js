const { validationResult } = require('express-validator');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err?.stack);
  console.error('Details:', JSON.stringify(err, Object.getOwnPropertyNames(err || {})));

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists.' });
  }
  if (err.code === '23503') {
    return res.status(404).json({ error: 'Referenced resource not found.' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = { errorHandler, validate };
