package com.silvermuller.seals.modules.inventory.model;

import jakarta.persistence.*;

@Entity
@Table(name = "operation_master", schema = "public")
public class OperationMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operation_name", nullable = false, unique = true)
    private String operationName;

    public OperationMaster() {}

    public OperationMaster(String operationName) {
        this.operationName = operationName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOperationName() {
        return operationName;
    }

    public void setOperationName(String operationName) {
        this.operationName = operationName;
    }
}
