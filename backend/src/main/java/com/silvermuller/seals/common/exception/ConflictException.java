package com.silvermuller.seals.common.exception;

/** The request is valid, but it conflicts with data that already exists (for example a PR with PO allocations). Maps to HTTP 409. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
