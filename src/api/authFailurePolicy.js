export const isDefinitiveAuthFailure = (error) => {
  const status = Number(error?.response?.status || 0);
  return status === 401 || status === 403;
};

