export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

// Forward async errors to Express (Express 4 does not do this itself)
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res, next) => next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  let details = err.details;
  if (err.name === 'ValidationError') { status = 400; details = Object.values(err.errors).map((e) => e.message); message = 'Validation failed'; }
  else if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  else if (err.code === 11000) { status = 409; message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(', ')}`; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON'; }
  if (status >= 500) { console.error(err); if (process.env.NODE_ENV === 'production') message = 'Server error'; }
  res.status(status).json({ message, ...(details && { details }) });
};
