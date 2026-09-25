package reprummble.perf;

/**
 * All knobs are environment variables so the same simulation jar can be
 * pointed at local dev or staging without editing code, and so CI can scale
 * load up/down without a rebuild.
 *
 * NEVER point BASE_URL at production — these simulations create accounts,
 * log in repeatedly, and are explicitly designed to push past the auth
 * rate limits (see LoginRateLimitSimulation) as part of verifying they
 * hold under concurrency.
 */
final class Config {
  private Config() {}

  static String baseUrl() {
    return env("BASE_URL", "http://localhost:5001");
  }

  static int users() {
    return Integer.parseInt(env("PERF_USERS", "10"));
  }

  static int rampSeconds() {
    return Integer.parseInt(env("PERF_RAMP_SECONDS", "20"));
  }

  static int durationSeconds() {
    return Integer.parseInt(env("PERF_DURATION_SECONDS", "60"));
  }

  /**
   * Comma-separated `email:password` pairs for pre-existing accounts used
   * by AuthenticatedApiSimulation, e.g.:
   *   PERF_TEST_ACCOUNTS="loadtest1@example.com:Passw0rd!,loadtest2@example.com:Passw0rd!"
   * Deliberately pre-provisioned rather than registered on the fly, both to
   * avoid tripping the register rate limit and because real user traffic
   * logs in once and reuses a session — a load test should model that, not
   * hammer /login per request.
   */
  static String testAccountsRaw() {
    return env("PERF_TEST_ACCOUNTS", "");
  }

  private static String env(String key, String fallback) {
    String v = System.getenv(key);
    return (v == null || v.isBlank()) ? fallback : v;
  }
}
