package reprummble.perf;

import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;
import io.gatling.javaapi.http.HttpProtocolBuilder;

import java.time.Duration;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Baseline throughput/latency smoke test against the unauthenticated
 * /api/health endpoint. Doesn't touch the DB or Supabase, so this isolates
 * pure Express + network overhead — the floor everything else is measured
 * against. Run this first; if this alone is slow, downstream simulations
 * showing "slow" results aren't telling you much new.
 *
 * Run:
 *   ./mvnw gatling:test -Dgatling.simulationClass=reprummble.perf.HealthCheckSimulation
 */
public class HealthCheckSimulation extends Simulation {

  private final HttpProtocolBuilder httpProtocol =
      http.baseUrl(Config.baseUrl())
          .acceptHeader("application/json")
          .userAgentHeader("gatling-reprummble-perf/1.0");

  private final ScenarioBuilder scn =
      scenario("Health check baseline")
          .exec(
              http("GET /api/health")
                  .get("/api/health")
                  .check(status().is(200)));

  {
    setUp(
            scn.injectOpen(
                rampUsers(Config.users()).during(Duration.ofSeconds(Config.rampSeconds())),
                constantUsersPerSec(Config.users()).during(Duration.ofSeconds(Config.durationSeconds())))
                .protocols(httpProtocol))
        .assertions(
            global().responseTime().percentile3().lt(500), // p95 < 500ms
            global().successfulRequests().percent().gt(99.0));
  }
}
