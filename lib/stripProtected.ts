// Fields a merchant must never be able to set through the admin API (they
// could otherwise move their rows into another store).
export function stripProtected<T extends Record<string, unknown>>(obj: T): T {
  delete obj.id
  delete obj.store_id
  delete obj.created_at
  delete obj.updated_at
  return obj
}
