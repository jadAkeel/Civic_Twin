"""Auth boundary for future JWT or Supabase-ready implementation."""
from app.modules.auth.router import current_user, require_roles, router

__all__ = ["current_user", "require_roles", "router"]
