package com.silvermuller.seals.modules.purchase.newpo;

import com.silvermuller.seals.modules.purchase.newpo.VendorRateService.NewPoException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Error responses for the New Purchase Order endpoints: {"status": 409, "error": "..."}.
 * Highest precedence so these messages are used before the project-wide catch-all in GlobalExceptionHandler,
 * which would otherwise turn them into 500s.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {NewPoController.class, PoByPrController.class, DirectPoController.class})
public class NewPoExceptionHandler {

    @ExceptionHandler(NewPoException.class)
    public ResponseEntity<Map<String, Object>> handle(NewPoException ex) {
        return error(ex.getStatus(), ex.getMessage());
    }

    /** Last line of defence: a constraint the service did not check first still gets a clear message. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handle(DataIntegrityViolationException ex) {
        return error(HttpStatus.CONFLICT, "The change conflicts with existing data and was not saved. Refresh and try again.");
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("status", status.value(), "error", message));
    }
}
