package com.silvermuller.seals.modules.inventory.dto;

import java.util.ArrayList;
import java.util.List;

public class MouldingBOMResponse {

    private boolean success;
    private String transactionNumber;
    private String slipNumber;
    private String message;
    private MovementPlan movementPlan;
    private List<TransactionResponse> transactions = new ArrayList<>();

    public MouldingBOMResponse() {
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getTransactionNumber() {
        return transactionNumber;
    }

    public void setTransactionNumber(String transactionNumber) {
        this.transactionNumber = transactionNumber;
    }

    public String getSlipNumber() {
        return slipNumber;
    }

    public void setSlipNumber(String slipNumber) {
        this.slipNumber = slipNumber;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public MovementPlan getMovementPlan() {
        return movementPlan;
    }

    public void setMovementPlan(MovementPlan movementPlan) {
        this.movementPlan = movementPlan;
    }

    public List<TransactionResponse> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<TransactionResponse> transactions) {
        this.transactions = transactions;
    }
}
