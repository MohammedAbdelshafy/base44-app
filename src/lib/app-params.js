const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) return defaultValue;
  const storageKey = `contech_${paramName}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }
  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }
  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }
  return storage.getItem(storageKey) || null;
}

export const appParams = {
  supabaseUrl: getAppParamValue("supabase_url", { defaultValue: import.meta.env.VITE_SUPABASE_URL }),
  supabaseAnonKey: getAppParamValue("supabase_anon_key", { defaultValue: import.meta.env.VITE_SUPABASE_ANON_KEY }),
  apiBaseUrl: getAppParamValue("api_base_url", { defaultValue: 'http://localhost:3002' }),
}
