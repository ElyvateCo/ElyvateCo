// Fields a merchant must never be able to set through the admin API (they
// could otherwise move their rows into another store).
export function stripProtected<T extends object>(obj: T): T {
  const o = obj as Record<string, unknown>
  delete o.id
  delete o.store_id
  delete o.created_at
  delete o.updated_at
  return obj
}
