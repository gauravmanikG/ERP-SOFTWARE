package com.silvermuller.seals.modules.purchase.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ConsolidatedEligibleItemDto {
    private String itemCode;
    private String itemName;
    private String description;
    private String category;
    private String uom;
    private BigDecimal combinedEligibleQty = BigDecimal.ZERO;
    private Integer sourcePrCount = 0;
    private List<String> sourcePrNumbers = new ArrayList<>();
    private BigDecimal avgEstRate = BigDecimal.ZERO;
    private BigDecimal totalEstAmount = BigDecimal.ZERO;
    private List<SourcePrAllocationDto> sourceAllocations = new ArrayList<>();

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUom() { return uom; }
    public void setUom(String uom) { this.uom = uom; }

    public BigDecimal getCombinedEligibleQty() { return combinedEligibleQty; }
    public void setCombinedEligibleQty(BigDecimal combinedEligibleQty) { this.combinedEligibleQty = combinedEligibleQty; }

    public Integer getSourcePrCount() { return sourcePrCount; }
    public void setSourcePrCount(Integer sourcePrCount) { this.sourcePrCount = sourcePrCount; }

    public List<String> getSourcePrNumbers() { return sourcePrNumbers; }
    public void setSourcePrNumbers(List<String> sourcePrNumbers) { this.sourcePrNumbers = sourcePrNumbers; }

    public BigDecimal getAvgEstRate() { return avgEstRate; }
    public void setAvgEstRate(BigDecimal avgEstRate) { this.avgEstRate = avgEstRate; }

    public BigDecimal getTotalEstAmount() { return totalEstAmount; }
    public void setTotalEstAmount(BigDecimal totalEstAmount) { this.totalEstAmount = totalEstAmount; }

    public List<SourcePrAllocationDto> getSourceAllocations() { return sourceAllocations; }
    public void setSourceAllocations(List<SourcePrAllocationDto> sourceAllocations) { this.sourceAllocations = sourceAllocations; }
}
