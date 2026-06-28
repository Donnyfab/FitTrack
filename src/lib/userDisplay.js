function emailLocalPart(email) {
  return typeof email === "string" ? email.split("@")[0] : "";
}

function isGeneratedEmailName(name, email) {
  const trimmed = `${name || ""}`.trim();
  const local = emailLocalPart(email);
  if (!trimmed || !local) return false;
  return trimmed.toLowerCase() === local.toLowerCase() && (/\d/.test(local) || local.includes(".") || local.length > 16);
}

export function getUserDisplayName(user, fallback = "User") {
  const name = `${user?.full_name || ""}`.trim();
  if (!name || isGeneratedEmailName(name, user?.email)) return fallback;
  return name;
}

export function getUserFirstName(user, fallback = "User") {
  return getUserDisplayName(user, fallback).split(/\s+/)[0] || fallback;
}
