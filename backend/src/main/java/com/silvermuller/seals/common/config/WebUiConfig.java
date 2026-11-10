package com.silvermuller.seals.common.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.time.Duration;

/**
 * How the built ERP screens (frontend/dist, copied into static/ by pom.xml) are served in production.
 * <ul>
 *   <li>/assets/** — script and style files whose names carry a content hash: a changed file always gets a new
 *       name, so browsers may keep them for a year without asking again. "/" itself (HomeController) is never
 *       cached, so a new release is picked up on the next visit.</li>
 *   <li>Every response gets basic browser-safety headers (see {@link SecurityHeadersFilter}).</li>
 * </ul>
 * Text responses are compressed (server.compression.* in application.properties).
 */
@Configuration
public class WebUiConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
            .addResourceLocations("classpath:/static/assets/")
            .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
    }

    /**
     * nosniff: the browser uses only the declared content type (an uploaded file can never run as a script);
     * SAMEORIGIN: other sites cannot show the ERP inside a frame (click-jacking); same-origin referrer: addresses
     * inside the ERP are not sent to other sites.
     */
    @Component
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public static class SecurityHeadersFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            response.setHeader("X-Content-Type-Options", "nosniff");
            response.setHeader("X-Frame-Options", "SAMEORIGIN");
            response.setHeader("Referrer-Policy", "same-origin");
            chain.doFilter(request, response);
        }
    }
}
