const listeners = new Set();
const TRACKED_REQUEST_KEY = "__omnisportActivityTracked";
const COMPLETED_REQUEST_KEY = "__omnisportActivityCompleted";

let activeRequestCount = 0;

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const beginTrackedRequest = (config) => {
  if (config?.omnisportBackground === true) return config;
  if (!config || config[TRACKED_REQUEST_KEY]) return config;
  config[TRACKED_REQUEST_KEY] = true;
  config[COMPLETED_REQUEST_KEY] = false;
  activeRequestCount += 1;
  emit();
  return config;
};

export const completeTrackedRequest = (config) => {
  if (
    !config ||
    !config[TRACKED_REQUEST_KEY] ||
    config[COMPLETED_REQUEST_KEY]
  ) {
    return;
  }
  config[COMPLETED_REQUEST_KEY] = true;
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  emit();
};

export const prepareTrackedRetry = (config) => {
  completeTrackedRequest(config);
  if (!config) return config;
  delete config[TRACKED_REQUEST_KEY];
  delete config[COMPLETED_REQUEST_KEY];
  return config;
};

export const subscribeToRequestActivity = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getActiveRequestCount = () => activeRequestCount;
