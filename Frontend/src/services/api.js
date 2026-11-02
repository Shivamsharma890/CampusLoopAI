const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);

export const token = () => localStorage.getItem("campusloop_token");

export const storedUser = () => {
  try {
    return JSON.parse(localStorage.getItem("campusloop_user") || "null");
  } catch {
    return null;
  }
};

export const setSession = (accessToken, user) => {
  localStorage.setItem("campusloop_token", accessToken);
  localStorage.setItem("campusloop_user", JSON.stringify(user || {}));
};

export const clearSession = () => {
  localStorage.removeItem("campusloop_token");
  localStorage.removeItem("campusloop_user");
};

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;

  // Let the browser set multipart boundary for FormData.
  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token()) {
    headers.Authorization = `Bearer ${token()}`;
  }

  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Cannot connect to API. Please start your FastAPI backend.",
    );
  }

  const raw = await response.text();

  let data;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const detail = data?.detail;

    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(", ")
      : typeof detail === "string"
        ? detail
        : data?.message || `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data;
}

export const endpoints = {
  login: (payload) =>
    api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  register: (payload) =>
    api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  items: (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });

    return api("/api/items" + (query.size ? `?${query.toString()}` : ""));
  },

  item: (id) => api(`/api/items/${id}`),

  createItem: (payload) =>
    api("/api/items", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  myItems: () => api("/api/items/mine"),

  updateItem: (id, payload) =>
    api(`/api/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteItem: (id) =>
    api(`/api/items/${id}`, {
      method: "DELETE",
    }),

  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return api("/api/upload-image", {
      method: "POST",
      body: formData,
    });
  },

  borrow: (payload) =>
    api("/api/borrow-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  myRequests: () => api("/api/borrow-requests/mine"),

  decide: (id, decision) =>
    api(`/api/borrow-requests/${id}/decision`, {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    }),

  returnRequest: (id) =>
    api(`/api/borrow-requests/${id}/return-request`, {
      method: "POST",
    }),

  confirmReturn: (id) =>
    api(`/api/borrow-requests/${id}/confirm-return`, {
      method: "POST",
    }),

  credits: () => api("/api/credits/me"),

  notifications: () => api("/api/notifications"),

  unreadNotificationCount: () => api("/api/notifications/unread-count"),

  markNotificationRead: (id) =>
    api(`/api/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllNotificationsRead: () =>
    api("/api/notifications/read-all", {
      method: "PATCH",
    }),

  chat: (message, conversationId = null, selection = {}) =>
    api("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        selected_item_id: selection.selected_item_id ?? null,
        selected_request_id: selection.selected_request_id ?? null,
      }),
    }),

  conversations: () => api("/api/assistant/conversations"),

  conversation: (id) => api(`/api/assistant/conversations/${id}`),

  deleteConversation: (id) =>
    api(`/api/assistant/conversations/${id}`, {
      method: "DELETE",
    }),
};
