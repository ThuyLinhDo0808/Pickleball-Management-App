function dbError(res, error, status = 400) {
  return res.status(status).json({ error: error.message || 'Database error', details: error });
}

function notFound(res, what = 'Resource') {
  return res.status(404).json({ error: `${what} not found.` });
}

module.exports = { dbError, notFound };
