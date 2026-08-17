export const apiFetch = (path: string, init?: RequestInit): Promise<Response> => {
  return fetch(`/api${path}`, init);
};
