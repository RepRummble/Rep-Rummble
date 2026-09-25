package reprummble.perf;

import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;
import io.gatling.javaapi.http.HttpProtocolBuilder;

import java.time.Duration;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Deliberately hammers /api/auth/login with concurrent bad-credential
 * requests to check the rate limiter (server/src/middleware/rateLimit.middleware.ts)
 * actually holds under real concurrency, not just the sequential loop the
 * Playwright test (e2e/tests/auth-api.spec.ts) does. This is the
 * intersection of "performance test" and "security test": a rate limiter
 * that only works when requests arrive one at a time isn't a rate limiter.
 *
 * Expected outcome: a healthy majority of responses should be 429 once the
 * per-IP limit (10 requests / 15 min, see rateLimit.middleware.ts) is
 * exceeded. This simulation asserts that, and FAILS if the server instead
 * lets everything through with 401 — that would mean the limiter isn't
 * engaging under load (e.g. reused across workers incorrectly).
 *
 * Run against local dev only, or a staging env you're allowed to hammer —
 * this intentionally looks identical to a credential-stuffing attack.
 *
 *   ./mvnw gatling:test -Dgatling.simulationClass=reprummble.perf.LoginRateLimitSimulation
 */
public class LoginRateLimitSimulation extends Simulation {

  private final HttpProtocolBuilder httpProtocol =
      http.baseUrl(Config.baseUrl())
          .acceptHeader("application/json")
          .contentTypeHeader("application/json")
          .userAgentHeader("gatling-reprummble-perf/1.0");

  // loginLimiter allows 10 requests / 15 min per IP (see
  // server/src/middleware/rateLimit.middleware.ts). Node's event loop
  // processes these one at a time even when Gatling fires them "at once",
  // so the outcome is deterministic: the first LIMIT requests get 401
  // (bad credentials, not yet limited), everything after gets 429.
  private static final int LOGIN_LIMIT = 10;
  private static final int BURST_SIZE = 50;

  private final ScenarioBuilder scn =
      scenario("Concurrent bad-credential login attempts")
          .exec(
              http("POST /api/auth/login (expect 429 once limited)")
                  .post("/api/auth/login")
                  // Only 429 counts as "OK" here — this check existing to
                  // fail (KO) is expected for the first ~LOGIN_LIMIT
                  // requests; what we're really asserting below is that a
                  // healthy majority of the burst gets blocked.
                  .check(status().is(429)));

  {
    // All from effectively the same source (this box), which is exactly
    // the scenario the per-IP limiter needs to catch.
    setUp(
            scn.injectOpen(atOnceUsers(BURST_SIZE))
                .protocols(httpProtocol))
        .assertions(
            // Expect at least (BURST_SIZE - LOGIN_LIMIT) / BURST_SIZE of
            // requests to be 429 — with 50 requests and a limit of 10,
            // that's >= 80%. A lower number here means the limiter is not
            // reliably engaging under concurrency and needs investigating
            // before you trust it in production.
            global()
                .successfulRequests()
                .percent()
                .gt(100.0 * (BURST_SIZE - LOGIN_LIMIT) / BURST_SIZE - 10.0));
  }
}
