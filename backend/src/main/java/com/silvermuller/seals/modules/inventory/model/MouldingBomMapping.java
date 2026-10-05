package com.silvermuller.seals.modules.inventory.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.Objects;

@Entity
@Table(name = "moulding_bom_mapping")
public class MouldingBomMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "moulded_item_id", nullable = false, foreignKey = @ForeignKey(name = "fk_mbm_moulded"))
    private Master mouldedItem;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "metal_shell_item_id", nullable = false, foreignKey = @ForeignKey(name = "fk_mbm_metal_shell"))
    private Master metalShellItem;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public MouldingBomMapping() {
    }

    public MouldingBomMapping(Master mouldedItem, Master metalShellItem) {
        this.mouldedItem = mouldedItem;
        this.metalShellItem = metalShellItem;
        this.active = true;
        this.createdAt = OffsetDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Master getMouldedItem() {
        return mouldedItem;
    }

    public void setMouldedItem(Master mouldedItem) {
        this.mouldedItem = mouldedItem;
    }

    public Master getMetalShellItem() {
        return metalShellItem;
    }

    public void setMetalShellItem(Master metalShellItem) {
        this.metalShellItem = metalShellItem;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        MouldingBomMapping that = (MouldingBomMapping) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
