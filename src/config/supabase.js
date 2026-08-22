import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ID permanente para ESTA pestaña.
// sessionStorage permanece mientras la pestaña siga abierta.
const TAB_ID_KEY = 'liquisistema_tab_id'

let tabId = sessionStorage.getItem(TAB_ID_KEY)

if (!tabId) {
  tabId = crypto.randomUUID()
  sessionStorage.setItem(TAB_ID_KEY, tabId)
}

// Storage independiente por pestaña
const tabStorage = {
  getItem: (key) => {
    return sessionStorage.getItem(`${tabId}_${key}`)
  },

  setItem: (key, value) => {
    sessionStorage.setItem(`${tabId}_${key}`, value)
  },

  removeItem: (key) => {
    sessionStorage.removeItem(`${tabId}_${key}`)
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: tabStorage,
      storageKey: `liquisistema-auth-${tabId}`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)