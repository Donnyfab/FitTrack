import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { seedSampleDataIfNeeded } from '@/lib/seedData';
import { applyThemePreference, getStoredThemePreference, normalizeThemePreference } from '@/lib/theme';

const AuthContext = createContext(null);

function mapUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      '',
  };
}

async function ensureSavedUserData(authUser) {
  const fallbackUser = mapUser(authUser);
  let profile = null;
  let settings = null;

  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!profileError && existingProfile) {
    profile = existingProfile;
  } else if (!profileError) {
    const { data: insertedProfile, error: insertProfileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: fallbackUser.full_name,
      })
      .select('*')
      .single();

    if (!insertProfileError) {
      profile = insertedProfile;
    }
  }

  const { data: existingSettings, error: settingsError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (!settingsError && existingSettings) {
    settings = existingSettings;
  } else if (!settingsError) {
    const { data: insertedSettings, error: insertSettingsError } = await supabase
      .from('user_settings')
      .insert({ user_id: authUser.id })
      .select('*')
      .single();

    if (!insertSettingsError) {
      settings = insertedSettings;
    }
  }

  return {
    ...fallbackUser,
    full_name: profile?.full_name || fallbackUser.full_name,
    avatar_url: profile?.avatar_url || null,
    profile,
    settings,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    applyThemePreference(settings?.theme_preference || getStoredThemePreference());
  }, [settings?.theme_preference]);

  const applySession = useCallback(async (session) => {
    if (session?.user) {
      try {
        const savedUserData = await ensureSavedUserData(session.user);
        setUser(savedUserData);
        setProfile(savedUserData.profile);
        setSettings(savedUserData.settings);
      } catch (e) {
        console.error('Saved user data load failed:', e);
        setUser(mapUser(session.user));
        setProfile(null);
        setSettings(null);
      }
      setIsAuthenticated(true);
      setAuthError(null);
      try {
        await seedSampleDataIfNeeded(session.user.id);
      } catch (e) {
        console.error('Sample data seed failed:', e);
      }
    } else {
      setUser(null);
      setProfile(null);
      setSettings(null);
      setIsAuthenticated(false);
    }
    setIsLoadingAuth(false);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      setAuthError({ type: 'auth_required', message: error.message });
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    await applySession(session);
  };

  const logout = (shouldRedirect = true) => {
    supabase.auth.signOut().then(() => {
      setUser(null);
      setProfile(null);
      setSettings(null);
      setIsAuthenticated(false);
      if (shouldRedirect) {
        window.location.href = '/login';
      }
    });
  };

  const navigateToLogin = () => {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.href)}`;
  };

  const refreshSavedUserData = async () => {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      throw new Error(error?.message || 'Authentication required');
    }

    const savedUserData = await ensureSavedUserData(authUser);
    setUser(savedUserData);
    setProfile(savedUserData.profile);
    setSettings(savedUserData.settings);
    return savedUserData;
  };

  const updateUserProfile = async ({
    fullName,
    unitsSystem,
    weeklyWorkoutGoal,
    themePreference,
    defaultRestTimerSeconds,
    showSetSummary,
    autoSaveWorkouts,
    notificationWorkoutReminders,
    notificationGoalProgress,
    notificationWeeklySummary,
  }) => {
    if (!user?.id) {
      throw new Error('Authentication required');
    }

    const normalizedWeeklyGoal = Math.min(14, Math.max(1, Number(weeklyWorkoutGoal) || 1));
    const normalizedTheme = normalizeThemePreference(themePreference || getStoredThemePreference());

    const settingsPayload = {
      user_id: user.id,
      units_system: unitsSystem,
      weekly_workout_goal: normalizedWeeklyGoal,
      theme_preference: normalizedTheme,
    };

    if (defaultRestTimerSeconds != null) {
      settingsPayload.default_rest_timer_seconds = Math.min(600, Math.max(15, Number(defaultRestTimerSeconds) || 90));
    }
    if (showSetSummary != null) settingsPayload.show_set_summary = Boolean(showSetSummary);
    if (autoSaveWorkouts != null) settingsPayload.auto_save_workouts = Boolean(autoSaveWorkouts);
    if (notificationWorkoutReminders != null) settingsPayload.notification_workout_reminders = Boolean(notificationWorkoutReminders);
    if (notificationGoalProgress != null) settingsPayload.notification_goal_progress = Boolean(notificationGoalProgress);
    if (notificationWeeklySummary != null) settingsPayload.notification_weekly_summary = Boolean(notificationWeeklySummary);

    const [{ error: profileError }, settingsResult] = await Promise.all([
      supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullName || null,
          },
          { onConflict: 'id' }
        ),
      supabase
        .from('user_settings')
        .upsert(settingsPayload, { onConflict: 'user_id' }),
    ]);

    if (profileError) throw new Error(profileError.message);
    if (settingsResult.error) {
      const message = settingsResult.error.message || '';
      if (
        settingsResult.error.code === 'PGRST204' ||
        [
          'theme_preference',
          'default_rest_timer_seconds',
          'show_set_summary',
          'auto_save_workouts',
          'notification_workout_reminders',
          'notification_goal_progress',
          'notification_weekly_summary',
        ].some((column) => message.includes(column))
      ) {
        const { error: retrySettingsError } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: user.id,
              units_system: unitsSystem,
              weekly_workout_goal: normalizedWeeklyGoal,
            },
            { onConflict: 'user_id' }
          );
        if (retrySettingsError) throw new Error(retrySettingsError.message);
      } else {
        throw new Error(settingsResult.error.message);
      }
    }

    applyThemePreference(normalizedTheme);

    return refreshSavedUserData();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        settings,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState: checkUserAuth,
        refreshSavedUserData,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
