const USER_TABLE_CANDIDATES = ['users', 'user'];

const isMissingTableError = (error) =>
  error?.code === '42P01' ||
  (typeof error?.message === 'string' &&
    error.message.toLowerCase().includes('relation') &&
    error.message.toLowerCase().includes('does not exist'));

const isMissingColumnError = (error) =>
  error?.code === '42703' ||
  (typeof error?.message === 'string' &&
    error.message.toLowerCase().includes('column') &&
    error.message.toLowerCase().includes('does not exist'));

const isUniqueViolation = (error) => error?.code === '23505';

const getAuthUid = async (supabase) => {
  try {
    const sessionResult = await supabase.auth.getSession();
    return sessionResult?.data?.session?.user?.id || null;
  } catch {
    return null;
  }
};

export const resolveCloudUserIdByUsername = async ({ supabase, username }) => {
  if (!supabase || !username) return null;

  for (const tableName of USER_TABLE_CANDIDATES) {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) continue;
      continue;
    }

    if (data?.id) {
      return data.id;
    }
  }

  return null;
};

export const ensureCloudUser = async ({ supabase, username }) => {
  if (!supabase || !username) return null;

  const authUid = await getAuthUid(supabase);

  for (const tableName of USER_TABLE_CANDIDATES) {
    let existing = null;

    if (authUid) {
      const byAuth = await supabase
        .from(tableName)
        .select('id')
        .eq('auth_uid', authUid)
        .maybeSingle();

      if (byAuth.error && !isMissingColumnError(byAuth.error)) {
        if (isMissingTableError(byAuth.error)) continue;
        continue;
      }
      existing = byAuth.data;
    }

    if (!existing) {
      const byUsername = await supabase
        .from(tableName)
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (byUsername.error) {
        if (isMissingTableError(byUsername.error)) continue;
        continue;
      }
      existing = byUsername.data;
    }

    if (existing?.id) {
      return existing.id;
    }

    let insertPayload = authUid ? { username, auth_uid: authUid } : { username };
    let insert = await supabase.from(tableName).insert(insertPayload).select('id').single();

    if (insert.error && isMissingColumnError(insert.error)) {
      insertPayload = { username };
      insert = await supabase.from(tableName).insert(insertPayload).select('id').single();
    }

    if (insert.error) {
      if (isMissingTableError(insert.error)) continue;

      if (isUniqueViolation(insert.error)) {
        const byUsername = await supabase
          .from(tableName)
          .select('id')
          .eq('username', username)
          .maybeSingle();
        if (byUsername.data?.id) return byUsername.data.id;
      }
      continue;
    }

    if (insert.data?.id) {
      return insert.data.id;
    }
  }

  return null;
};
