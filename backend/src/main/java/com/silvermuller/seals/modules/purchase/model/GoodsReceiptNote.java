package com.silvermuller.seals.modules.purchase.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class GoodsReceiptNote {
    private Long id;
    @JsonAlias({"grnNumber", "grn_number"})
    private String grnNumber;
    @JsonAlias({"grnDate", "grn_date"})
    private LocalDate grnDate;
    @JsonAlias({"poNumber", "po_number"})
    private String poNumber;
    @JsonAlias({"poDate", "po_date"})
    private String poDate;
    @JsonAlias({"prNumber", "pr_number"})
    private String prNumber;
    @JsonAlias({"vendorCode", "vendor_code"})
    private String vendorCode;
    @JsonAlias({"vendorName", "vendor_name"})
    private String vendorName;
    @JsonAlias({"vendorGstin", "vendor_gstin"})
    private String vendorGstin;
    @JsonAlias({"vendorChallanNo", "vendor_challan_no", "deliveryChallanNumber", "challanNo", "challan_no"})
    private String vendorChallanNo;
    @JsonAlias({"vendorChallanDate", "vendor_challan_date", "deliveryChallanDate", "challanDate"})
    private LocalDate vendorChallanDate;
    @JsonAlias({"vendorInvoiceNo", "vendor_invoice_no", "invoiceNumber", "invoiceNo"})
    private String vendorInvoiceNo;
    @JsonAlias({"vendorInvoiceDate", "vendor_invoice_date", "invoiceDate"})
    private LocalDate vendorInvoiceDate;
    @JsonAlias({"transporterName", "transporter_name"})
    private String transporterName;
    @JsonAlias({"vehicleNumber", "vehicle_number"})
    private String vehicleNumber;
    @JsonAlias({"storeLocation", "store_location", "store"})
    private String storeLocation;
    @JsonAlias({"receivedBy", "received_by"})
    private String receivedBy;
    @JsonAlias({"inspectedBy", "inspected_by"})
    private String inspectedBy;
    private String status; // DRAFT, POSTED, CANCELLED
    private BigDecimal totalOrderedQty = BigDecimal.ZERO;
    private BigDecimal totalChallanQty = BigDecimal.ZERO;
    private BigDecimal totalReceivedQty = BigDecimal.ZERO;
    private BigDecimal totalAcceptedQty = BigDecimal.ZERO;
    private BigDecimal totalRejectedQty = BigDecimal.ZERO;
    private BigDecimal totalPendingQty = BigDecimal.ZERO;
    private BigDecimal totalValue = BigDecimal.ZERO;
    private String remarks;
    private String createdAt;
    private String createdBy;
    private String updatedAt;
    private String updatedBy;

    private List<GoodsReceiptNoteItem> items = new ArrayList<>();

    public GoodsReceiptNote() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getGrnNumber() { return grnNumber; }
    public void setGrnNumber(String grnNumber) { this.grnNumber = grnNumber; }

    public LocalDate getGrnDate() { return grnDate; }
    public void setGrnDate(LocalDate grnDate) { this.grnDate = grnDate; }

    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }

    public String getPoDate() { return poDate; }
    public void setPoDate(String poDate) { this.poDate = poDate; }

    public String getPrNumber() { return prNumber; }
    public void setPrNumber(String prNumber) { this.prNumber = prNumber; }

    public String getVendorCode() { return vendorCode; }
    public void setVendorCode(String vendorCode) { this.vendorCode = vendorCode; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public String getVendorGstin() { return vendorGstin; }
    public void setVendorGstin(String vendorGstin) { this.vendorGstin = vendorGstin; }

    public String getVendorChallanNo() { return vendorChallanNo; }
    public void setVendorChallanNo(String vendorChallanNo) { this.vendorChallanNo = vendorChallanNo; }

    public LocalDate getVendorChallanDate() { return vendorChallanDate; }
    public void setVendorChallanDate(LocalDate vendorChallanDate) { this.vendorChallanDate = vendorChallanDate; }

    public String getVendorInvoiceNo() { return vendorInvoiceNo; }
    public void setVendorInvoiceNo(String vendorInvoiceNo) { this.vendorInvoiceNo = vendorInvoiceNo; }

    public LocalDate getVendorInvoiceDate() { return vendorInvoiceDate; }
    public void setVendorInvoiceDate(LocalDate vendorInvoiceDate) { this.vendorInvoiceDate = vendorInvoiceDate; }

    public String getTransporterName() { return transporterName; }
    public void setTransporterName(String transporterName) { this.transporterName = transporterName; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getStoreLocation() { return storeLocation; }
    public void setStoreLocation(String storeLocation) { this.storeLocation = storeLocation; }

    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }

    public String getInspectedBy() { return inspectedBy; }
    public void setInspectedBy(String inspectedBy) { this.inspectedBy = inspectedBy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getTotalOrderedQty() { return totalOrderedQty; }
    public void setTotalOrderedQty(BigDecimal totalOrderedQty) { this.totalOrderedQty = totalOrderedQty; }

    public BigDecimal getTotalChallanQty() { return totalChallanQty; }
    public void setTotalChallanQty(BigDecimal totalChallanQty) { this.totalChallanQty = totalChallanQty; }

    public BigDecimal getTotalReceivedQty() { return totalReceivedQty; }
    public void setTotalReceivedQty(BigDecimal totalReceivedQty) { this.totalReceivedQty = totalReceivedQty; }

    public BigDecimal getTotalAcceptedQty() { return totalAcceptedQty; }
    public void setTotalAcceptedQty(BigDecimal totalAcceptedQty) { this.totalAcceptedQty = totalAcceptedQty; }

    public BigDecimal getTotalRejectedQty() { return totalRejectedQty; }
    public void setTotalRejectedQty(BigDecimal totalRejectedQty) { this.totalRejectedQty = totalRejectedQty; }

    public BigDecimal getTotalPendingQty() { return totalPendingQty; }
    public void setTotalPendingQty(BigDecimal totalPendingQty) { this.totalPendingQty = totalPendingQty; }

    public BigDecimal getTotalValue() { return totalValue; }
    public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public List<GoodsReceiptNoteItem> getItems() { return items; }
    public void setItems(List<GoodsReceiptNoteItem> items) { this.items = items; }
}
