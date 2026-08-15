package com.silvermuller.seals.modules.inventory.dto;

public class TransactionTypeResponse {

    private Long id;
    private String type;

    public TransactionTypeResponse() {
    }

    public TransactionTypeResponse(Long id, String type) {
        this.id = id;
        this.type = type;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
