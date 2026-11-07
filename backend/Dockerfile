# Multi-stage Dockerfile for the Spring Boot backend.
# Restart behaviour: the container's restart policy (docker-compose.yml: restart: unless-stopped, or the
# platform's equivalent) restarts it when the JVM exits. The HEALTHCHECK below marks a running-but-hung API
# as "unhealthy" so the platform (e.g. AWS ECS) can replace it.

# ---------- build ----------
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies in their own layer so code-only changes rebuild quickly.
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---------- run ----------
FROM eclipse-temurin:17-jre
WORKDIR /app

# curl is used by the HEALTHCHECK only.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system app \
 && useradd --system --gid app --no-create-home app

COPY --from=build /app/target/seals-backend.jar app.jar
USER app

ENV PORT=4000
# MaxRAMPercentage: size the heap from the container's memory limit.
# ExitOnOutOfMemoryError: an out-of-memory JVM exits, so the restart policy brings up a fresh one.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 4000

# Liveness only (no database check), so a database outage never causes restart loops.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT}/api/health/live" || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
