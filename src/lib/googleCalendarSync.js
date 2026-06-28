const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

let googleIdentityScriptPromise;
let tokenClient;
let accessToken;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in script could not load."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

function getGoogleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
}

function ensureGoogleCalendarReady() {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID. Add your Google OAuth web client ID in Vercel and .env.");
  }
  return clientId;
}

export async function requestGoogleCalendarAccess() {
  const clientId = ensureGoogleCalendarReady();
  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      prompt: accessToken ? "" : "consent",
      callback: (response) => {
        if (response?.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        accessToken = response.access_token;
        resolve(accessToken);
      },
      error_callback: (error) => {
        reject(new Error(error?.message || "Google Calendar connection was cancelled."));
      },
    });

    tokenClient.requestAccessToken();
  });
}

function hashToHex(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildEventId(event) {
  const source = `${event.id || event.name}:${event.date}:${event.name}`;
  return `fittrack${hashToHex(source)}${hashToHex(source.split("").reverse().join(""))}`;
}

function nextDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function buildCalendarEvent(event) {
  const sets = event.plannedSets ? `${event.completedSets || 0}/${event.plannedSets} sets` : "Workout";
  const muscleGroup = event.muscleGroup || "Workout";
  const status = event.type || "scheduled";

  return {
    id: buildEventId(event),
    summary: `FitTrack: ${event.name}`,
    description: [
      `${muscleGroup} workout from FitTrack.`,
      `Status: ${status}`,
      `Sets: ${sets}`,
      event.virtual ? "Generated from a recurring FitTrack weekly plan." : "Synced from a FitTrack workout.",
    ].join("\n"),
    start: { date: event.date },
    end: { date: nextDateKey(event.date) },
    extendedProperties: {
      private: {
        fittrackSource: "fittrack",
        fittrackEventId: String(event.id || ""),
        fittrackDate: event.date,
      },
    },
  };
}

async function calendarRequest(path, options = {}) {
  if (!accessToken) {
    await requestGoogleCalendarAccess();
  }

  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    accessToken = null;
    await requestGoogleCalendarAccess();
    return calendarRequest(path, options);
  }

  return response;
}

async function upsertGoogleCalendarEvent(event) {
  const calendarEvent = buildCalendarEvent(event);
  const insertResponse = await calendarRequest("/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify(calendarEvent),
  });

  if (insertResponse.ok) return { action: "created" };

  if (insertResponse.status === 409) {
    const patchResponse = await calendarRequest(`/calendars/primary/events/${calendarEvent.id}`, {
      method: "PATCH",
      body: JSON.stringify(calendarEvent),
    });
    if (patchResponse.ok) return { action: "updated" };
    const patchError = await patchResponse.json().catch(() => ({}));
    throw new Error(patchError?.error?.message || "Google Calendar event update failed.");
  }

  const error = await insertResponse.json().catch(() => ({}));
  throw new Error(error?.error?.message || "Google Calendar sync failed.");
}

export async function syncEventsToGoogleCalendar(events) {
  const syncableEvents = events.filter((event) => event.date && event.name && event.type !== "missed");
  await requestGoogleCalendarAccess();

  let created = 0;
  let updated = 0;
  for (const event of syncableEvents) {
    const result = await upsertGoogleCalendarEvent(event);
    if (result.action === "created") created += 1;
    if (result.action === "updated") updated += 1;
  }

  return { created, updated, total: syncableEvents.length };
}

export function isGoogleCalendarConfigured() {
  return Boolean(getGoogleClientId());
}
