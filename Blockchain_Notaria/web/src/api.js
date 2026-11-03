const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001/api";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Servidor sin conexión. Inicia la API.");
    }
    throw error;
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const payload = contentType.includes("application/json") ? await response.json() : {};
    throw new Error(payload.error || `Error de API (${response.status})`);
  }
  if (!contentType.includes("application/json")) return response.blob();
  return response.json();
}

export const api = {
  me: () => request("/auth/me"),
  login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/logout", { method: "POST", body: "{}" }),
  documents: (archived = false) => request(`/documents${archived ? "?archived=true" : ""}`),
  archiveDocument: (id) => request(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" }),
  restoreDocument: (id) => request(`/documents/${encodeURIComponent(id)}/restore`, { method: "POST", body: "{}" }),
  document: (id) => request(`/documents/${encodeURIComponent(id)}`),
  compare: (form) => request("/documents/compare", { method: "POST", body: form }),
  register: (form) => request("/documents", { method: "POST", body: form }),
  verify: (id, form) => request(`/documents/${encodeURIComponent(id)}/verify`, { method: "POST", body: form }),
  revise: (id, form) => request(`/documents/${encodeURIComponent(id)}/revisions`, { method: "POST", body: form }),
  anchor: (id) => request(`/documents/${encodeURIComponent(id)}/anchor`, { method: "POST", body: "{}" }),
  publicVerify: (id) => request(`/public/verify/${encodeURIComponent(id)}`),
  audit: () => request("/audit"),
  users: () => request("/users"),
  createUser: (user) => request("/users", { method: "POST", body: JSON.stringify(user) }),
  downloadFile: (id) => request(`/documents/${encodeURIComponent(id)}/file`),
  downloadFileWithQr: (id) => request(`/documents/${encodeURIComponent(id)}/file-with-qr`),
  downloadQrPng: (id) => request(`/documents/${encodeURIComponent(id)}/qr.png`),
  downloadQrPdf: (id) => request(`/documents/${encodeURIComponent(id)}/qr.pdf`),
  downloadRevision: (id, version) => request(`/documents/${encodeURIComponent(id)}/revisions/${encodeURIComponent(version)}/file`),
  downloadCertificate: (id) => request(`/documents/${encodeURIComponent(id)}/certificate`),
  health: () => request("/health"),
};

export { API_URL };
