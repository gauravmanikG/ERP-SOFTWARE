package com.silvermuller.seals.modules.notifications.dto;

import java.util.ArrayList;
import java.util.List;

public class BulkDeleteAlertsRequest {

    /** IDS | CLEARED | CLEARED_OLDER_THAN | MATCHING */
    private String scope = "IDS";
    private List<Long> ids = new ArrayList<>();
    private Integer olderThanDays;
    private String status;
    private String item;
    private String department;
    private String from;
    private String to;

    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public List<Long> getIds() { return ids; }
    public void setIds(List<Long> ids) { this.ids = ids; }
    public Integer getOlderThanDays() { return olderThanDays; }
    public void setOlderThanDays(Integer olderThanDays) { this.olderThanDays = olderThanDays; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }
}
