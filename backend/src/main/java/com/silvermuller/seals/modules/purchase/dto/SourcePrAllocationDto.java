package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class SourcePrAllocationDto {
    private Long prId;
    private String prNumber;
    private LocalDate prDate;
    private String department;
    private String store;
    private String requisitioner;
    private String priority;
    private Long prItemId;
    private String itemCode;
    private String itemName;
    private String uom;
    private BigDecimal reqQty = BigDecimal.ZERO;
    private BigDecimal orderedQty = BigDecimal.ZERO;
    private BigDecimal remainingQty = BigDecimal.ZERO;
    private BigDecimal estRate = BigDecimal.ZERO;
    private LocalDate requiredDate;
    private String remarks;

    public Long getPrId() { return prId; }
    public void setPrId(Long prId) { this.prId = prId; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    public LocalDate getPrDate() { return prDate; }
    public void setPrDate(LocalDate prDate) { this.prDate = prDate; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getStore() { return store; }
    public void setStore(String store) { this.store = store; }

    public String getRequisitioner() { return requisitioner; }
    public void setRequisitioner(String requisitioner) { this.requisitioner = requisitioner; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Long getPrItemId() { return prItemId; }
    public void setPrItemId(Long prItemId) { this.prItemId = prItemId; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getUom() { return uom; }
    public void setUom(String uom) { this.uom = uom; }

    public BigDecimal getReqQty() { return reqQty; }
    public void setReqQty(BigDecimal reqQty) { this.reqQty = reqQty; }

    public BigDecimal getOrderedQty() { return orderedQty; }
    public void setOrderedQty(BigDecimal orderedQty) { this.orderedQty = orderedQty; }

    public BigDecimal getRemainingQty() { return remainingQty; }
    public void setRemainingQty(BigDecimal remainingQty) { this.remainingQty = remainingQty; }

    public BigDecimal getEstRate() { return estRate; }
    public void setEstRate(BigDecimal estRate) { this.estRate = estRate; }

    public LocalDate getRequiredDate() { return requiredDate; }
    public void setRequiredDate(LocalDate requiredDate) { this.requiredDate = requiredDate; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
