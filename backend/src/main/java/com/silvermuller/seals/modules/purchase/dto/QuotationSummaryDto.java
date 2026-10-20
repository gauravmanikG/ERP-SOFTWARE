package com.silvermuller.seals.modules.purchase.dto;

public class QuotationSummaryDto {
    private long totalQuotations;
    private long awaitingReviewCount;
    private long approvedCount;
    private long expiringSoonCount;
    private long activeVendorsCount;
    private long recentlyReceivedCount;

    public QuotationSummaryDto() {}

    public long getTotalQuotations() { return totalQuotations; }
    public void setTotalQuotations(long totalQuotations) { this.totalQuotations = totalQuotations; }

    public long getAwaitingReviewCount() { return awaitingReviewCount; }
    public void setAwaitingReviewCount(long awaitingReviewCount) { this.awaitingReviewCount = awaitingReviewCount; }

    public long getApprovedCount() { return approvedCount; }
    public void setApprovedCount(long approvedCount) { this.approvedCount = approvedCount; }

    public long getExpiringSoonCount() { return expiringSoonCount; }
    public void setExpiringSoonCount(long expiringSoonCount) { this.expiringSoonCount = expiringSoonCount; }

    public long getActiveVendorsCount() { return activeVendorsCount; }
    public void setActiveVendorsCount(long activeVendorsCount) { this.activeVendorsCount = activeVendorsCount; }

    public long getRecentlyReceivedCount() { return recentlyReceivedCount; }
    public void setRecentlyReceivedCount(long recentlyReceivedCount) { this.recentlyReceivedCount = recentlyReceivedCount; }
}
