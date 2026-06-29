export const sendSuccess = (res, data, statusCode = 200, extra = {}) => {
  res.status(statusCode).json({
    success: true,
    data,
    ...extra,
  });
};

export const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Loi he thong',
    code: error.code || 'INTERNAL_SERVER_ERROR',
  });
};
