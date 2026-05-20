const API_URL = 'https://careerforge-pro-ez6o.onrender.com';
const normalizedApiBase = String(API_URL).trim().replace(/\/$/, '');

export const apiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedApiBase ? `${normalizedApiBase}${normalizedPath}` : normalizedPath;
};

export const isNetworkError = (error) => {
  const message = String(error?.message || '');
  return error instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(message);
};

export const isHighDemandError = (message) => /high demand|busy|try again|unavailable|overloaded|503|rate limit/i.test(String(message || ''));

export const parseErrorBody = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
};

export const getErrorMessage = (errorBody, fallback) => {
  const detail = errorBody?.details || errorBody?.error;
  return String(detail || fallback || 'Request failed.');
};

export const backendOfflineMessage = 'Cannot reach the backend server. Start the backend on port 5000 and try again.';
