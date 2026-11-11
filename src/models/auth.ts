// Mirrors UserResponse in src/internal/servers/users/api.py.
export interface CurrentUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

// GET /me/permissions: every user has basic_access; admins and configured
// super users also have full_admin_panel_access.
export type Permission = "basic_access" | "full_admin_panel_access";

/** Session identity and permissions confirmed by the backend. */
export type Account = { user: CurrentUser; permissions: Permission[] };

/** Editable frontend profile, not persisted to the backend. */
export type Profile = { name: string; email: string; avatar: string };
