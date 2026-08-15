# Multi-stage Dockerfile for Spring Boot Java Backend (Root Context)
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY backend/pom.xml ./
COPY backend/src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/seals-backend.jar app.jar
EXPOSE 4000
ENTRYPOINT ["java", "-jar", "app.jar"]
