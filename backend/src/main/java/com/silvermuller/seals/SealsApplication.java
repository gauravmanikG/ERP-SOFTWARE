package com.silvermuller.seals;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.TimeZone;

@SpringBootApplication
public class SealsApplication {
    public static void main(String[] args) {
        // Ensure JVM timezone uses a Postgres-recognized ID
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
        SpringApplication.run(SealsApplication.class, args);
        System.out.println("Silver Muller Seals API listening — try http://localhost:4000/api/health");
    }
}
