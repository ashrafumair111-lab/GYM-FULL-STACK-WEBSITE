/**
 * Global Express error handler.
 * Normalises errors thrown anywhere in the pipeline.
 */
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  console.error('❌  Error:', err);

  const status = err.status || 500;
  const code   = err.code   || 'INTERNAL_ERROR';

  res.status(status).json({
    success: false,
    code,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
