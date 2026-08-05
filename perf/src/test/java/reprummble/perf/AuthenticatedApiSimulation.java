package reprummble.perf;

import io.gatling.javaapi.core.FeederBuilder;
import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;
import io.gatling.javaapi.http.HttpProtocolBuilder;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Models a realistic logged-in user: log in ONCE, then reuse the session
 * token for repeated reads, same as the real web/mobile app would (and
 * unlike naive load tests that re-login on every request, which would
 * mostly just be measuring — and tripping — the login rate limiter added
 * in server/src/middleware/rateLimit.middleware.ts).
 *
 * Requires PERF_TEST_ACCOUNTS to be set to real, pre-existing accounts —
 * see Config.java. Without it, this simulation fails fast with a clear
 * message instead of silently hammering /login with bogus credentials.
 *
 * Run:
 *   PERF_TEST_ACCOUNTS="user1@example.com:pass,user2@example.com:pass" \
 *   ./mvnw gatling:test -Dgatling.simulationClass=reprummble.perf.AuthenticatedApiSimulation
 */
public class AuthenticatedApiSimulation extends Simulation {

  static {
    if (Config.testAccountsRaw().isBlank()) {
      throw new IllegalStateException(
          "PERF_TEST_ACCOUNTS is not set. This simulation needs real pre-existing accounts "
              + "(email:password[,email:password...]) so it can log in once per virtual user and "
              + "reuse the token, instead of hammering /api/auth/login per request. "
              + "See perf/README.md.");
    }
  }

  private final HttpProtocolBuilder httpProtocol =
      http.baseUrl(Config.baseUrl())
          .acceptHeader("application/json")
          .contentTypeHeader("application/json")
          .userAgentHeader("gatling-reprummble-perf/1.0");

  private static FeederBuilder<Object> accountsFeeder() {
    List<Map<String, Object>> rows = new ArrayList<>();
    for (String pair : Config.testAccountsRaw().split(",")) {
      String[] parts = pair.trim().split(":", 2);
      if (parts.length != 2) continue;
      Map<String, Object> row = new HashMap<>();
      row.put("email", parts[0]);
      row.put("password", parts[1]);
      rows.add(row);
    }
    if (rows.isEmpty()) {
      throw new IllegalStateException("PERF_TEST_ACCOUNTS parsed to zero valid email:password pairs.");
    }
    return listFeeder(rows).circular();
  }

  private final ScenarioBuilder scn =
      scenario("Authenticated read workload")
          .feed(accountsFeeder())
          .exec(
              http("POST /api/auth/login")
                  .post("/api/auth/login")
                  .body(StringBody("{\"email\":\"#{email}\",\"password\":\"#{password}\"}"))
                  .check(status().is(200))
                  .check(jsonPath("$.data.token").saveAs("authToken")))
          .pause(Duration.ofMillis(200))
          .repeat(5)
          .on(
              exec(
                      http("GET /api/auth/me")
                          .get("/api/auth/me")
                          .header("Authorization", "Bearer #{authToken}")
                          .check(status().is(200)))
                  .pause(Duration.ofMillis(300))
                  .exec(
                      http("GET /api/leaderboard")
                          .get("/api/leaderboard")
                          .header("Authorization", "Bearer #{authToken}")
                          .check(status().is(200)))
                  .pause(Duration.ofMillis(300))
                  .exec(
                      http("GET /api/exercises")
                          .get("/api/exercises")
                          .header("Authorization", "Bearer #{authToken}")
                          .check(status().is(200)))
                  .pause(Duration.ofMillis(300))
                  .exec(
                      http("GET /api/meals")
                          .get("/api/meals")
                          .header("Authorization", "Bearer #{authToken}")
                          .check(status().is(200)))
                  .pause(Duration.ofMillis(300))
                  .exec(
                      http("GET /api/workouts")
                          .get("/api/workouts")
                          .header("Authorization", "Bearer #{authToken}")
                          .check(status().is(200)))
                  .pause(Duration.ofSeconds(1)));

  {
    setUp(
            scn.injectOpen(
                rampUsers(Config.users()).during(Duration.ofSeconds(Config.rampSeconds())))
                .protocols(httpProtocol))
        .assertions(
            global().responseTime().percentile3().lt(1000), // p95 < 1s
            global().successfulRequests().percent().gt(95.0));
  }
}
