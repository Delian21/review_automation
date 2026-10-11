// Turns Supabase auth errors into plain, helpful copy for the auth forms.
export function authErrorMessage(error: unknown): string {
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message)
      : String(error ?? "");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  if (/user_already_exists|already registered|already been registered/i.test(code + raw)) {
    return "An account already exists for that email. Log in instead.";
  }
  if (/invalid_credentials|invalid login credentials/i.test(code + raw)) {
    return "That email and password don't match. Check them and try again.";
  }
  if (/weak_password|password should be at least/i.test(code + raw)) {
    return "Use at least 8 characters for your password.";
  }
  if (/email_not_confirmed|email not confirmed/i.test(code + raw)) {
    return "Confirm your email first. Check your inbox for the link.";
  }
  if (/rate.?limit|too many requests|security purposes/i.test(code + raw)) {
    return "Too many tries. Wait a moment, then try again.";
  }
  if (/fetch failed|network|failed to fetch|ECONNREFUSED/i.test(code + raw)) {
    return "We couldn't reach ReviewLoop. Check your connection and try again.";
  }
  if (/email.*invalid|invalid.*email|invalid format/i.test(code + raw)) {
    return "That doesn't look like an email address. Check it and try again.";
  }
  return "That didn't work. Check your details and try again.";
}
