import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ID permanente para ESTA pestaña
// sessionStorage permanece mientras la pestaña siga abierta.
const TAB_ID_KEY = "liquisistema_tab_id";

const generarUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

let tabId = sessionStorage.getItem(TAB_ID_KEY);

if (!tabId) {
  tabId = generarUUID();
  sessionStorage.setItem(TAB_ID_KEY, tabId);
}

// =========================================================
// PERSISTENCIA DE SESIÓN
// =========================================================

const AUTH_PERSISTENCE_KEY = "liquisistema_auth_persistence";

let authPersistence =
  localStorage.getItem(AUTH_PERSISTENCE_KEY) === "local" ? "local" : "session";

export const setAuthPersistence = (remember) => {
  authPersistence = remember ? "local" : "session";

  if (remember) {
    localStorage.setItem(AUTH_PERSISTENCE_KEY, "local");
  } else {
    localStorage.removeItem(AUTH_PERSISTENCE_KEY);
  }
};

// =========================================================
// STORAGE DE SUPABASE
// =========================================================

const tabStorage = {
  getItem: (key) => {
    // Si existe una sesión persistente, la recuperamos.
    if (authPersistence === "local") {
      return localStorage.getItem("liquisistema-auth-persistent");
    }
    // Sesión normal: independiente de esta pestaña.
    return sessionStorage.getItem(`${tabId}_${key}`);
  },

  setItem: (key, value) => {
    if (authPersistence === "local") {
      localStorage.setItem("liquisistema-auth-persistent", value);
      return;
    }

    sessionStorage.setItem(`${tabId}_${key}`, value);
  },

  removeItem: (key) => {
    // Limpiar sesión persistente.
    localStorage.removeItem("liquisistema-auth-persistent");

    // Limpiar cualquier sesión normal de esta pestaña.
    localStorage.removeItem(key);
    sessionStorage.removeItem(`${tabId}_${key}`);
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: tabStorage,
    storageKey: `liquisistema-auth-${tabId}`,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
