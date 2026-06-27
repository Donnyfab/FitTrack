/**
 * Compatibility layer — same API surface as Base44 SDK, backed by Supabase + ChatGPT.
 * Pages keep using `base44.entities.*` and `base44.auth.*` without UI changes.
 */
import { supabase } from '@/lib/supabase';

const SORT_COLUMN_MAP = {
  date: 'date',
  created_date: 'created_at',
};

function parseSort(sortStr) {
  if (!sortStr) return { column: 'created_at', ascending: false };
  const desc = sortStr.startsWith('-');
  const field = desc ? sortStr.slice(1) : sortStr;
  return {
    column: SORT_COLUMN_MAP[field] || field,
    ascending: !desc,
  };
}

function mapWorkout(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    muscleGroup: row.muscle_group,
    notes: row.notes,
    exercises: row.exercises ?? [],
    created_date: row.created_at,
  };
}

function mapGoal(row) {
  if (!row) return row;
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    target: row.target,
    deadline: row.deadline,
    status: row.status,
    progress: row.progress,
    notes: row.notes,
    created_date: row.created_at,
  };
}

function toDbWorkout(data) {
  return {
    name: data.name,
    date: data.date,
    muscle_group: data.muscleGroup || null,
    notes: data.notes || null,
    exercises: data.exercises ?? [],
  };
}

function toDbGoal(data) {
  return {
    title: data.title,
    type: data.type,
    target: data.target || null,
    deadline: data.deadline || null,
    status: data.status || 'active',
    progress: Number(data.progress) || 0,
    notes: data.notes || null,
  };
}

async function requireUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw { status: 401, message: 'Authentication required' };
  }
  return user.id;
}

function createEntity(table, mapRow, toDb) {
  return {
    async list(sort, limit = 100) {
      const userId = await requireUserId();
      const { column, ascending } = parseSort(sort);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order(column, { ascending })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map(mapRow);
    },

    async filter(filters = {}, sort, limit = 100) {
      const userId = await requireUserId();
      const { column, ascending } = parseSort(sort);
      let query = supabase.from(table).select('*').eq('user_id', userId);

      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query
        .order(column, { ascending })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map(mapRow);
    },

    async get(id) {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw { status: 404, message: 'Not found' };
      return mapRow(data);
    },

    async create(payload) {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from(table)
        .insert({ ...toDb(payload), user_id: userId })
        .select('*')
        .single();

      if (error) throw error;
      return mapRow(data);
    },

    async update(id, payload) {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from(table)
        .update(toDb(payload))
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw error;
      return mapRow(data);
    },

    async delete(id) {
      const userId = await requireUserId();
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },
  };
}

const auth = {
  async me() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw { status: 401, message: error?.message || 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email,
      full_name:
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '',
      avatar_url: profile?.avatar_url || null,
    };
  },

  async loginViaEmailPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },

  loginWithProvider(provider, redirectPath = '/') {
    const redirectTo = `${window.location.origin}${redirectPath}`;
    supabase.auth.signInWithOAuth({
      provider: provider === 'google' ? 'google' : provider,
      options: { redirectTo },
    });
  },

  async register({ email, password }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw new Error(error.message);
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup',
    });
    if (error) throw new Error(error.message);
    return data.session ? { access_token: data.session.access_token } : null;
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw new Error(error.message);
  },

  async setToken(accessToken) {
    if (!accessToken) return;
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    });
    if (error) throw new Error(error.message);
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  },

  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  logout(redirectUrl) {
    supabase.auth.signOut().then(() => {
      if (redirectUrl) {
        window.location.href = '/login';
      }
    });
  },

  redirectToLogin(returnUrl) {
    const target = returnUrl || window.location.href;
    window.location.href = `/login?redirect=${encodeURIComponent(target)}`;
  },
};

export const base44 = {
  auth,
  entities: {
    Workout: createEntity('workouts', mapWorkout, toDbWorkout),
    Goal: createEntity('goals', mapGoal, toDbGoal),
  },
};
