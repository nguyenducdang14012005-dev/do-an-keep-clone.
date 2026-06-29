export const cleanString = (value, maxLength) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
};

export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return cleanString(String(forwarded).split(',')[0], 50);
  }

  return cleanString(req.ip || req.socket?.remoteAddress || null, 50);
};

export const getUserAgent = (req) => cleanString(req.headers['user-agent'], 255);
