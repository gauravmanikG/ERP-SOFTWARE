package com.silvermuller.seals.modules.inventory.model;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "fg_bom")
public class FgBomEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sms_new_part_no")
    private String smsNewPartNo;

    @Column(name = "old_code", nullable = false)
    private String oldCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "bom_count")
    private Integer bomCount;

    @Column(name = "outer_metal_shell")
    private Integer outerMetalShell = 0;

    @Column(name = "inner_metal_shell")
    private Integer innerMetalShell = 0;

    @Column(name = "spring")
    private Integer spring = 0;

    @Column(name = "middle_metal_shell")
    private Integer middleMetalShell = 0;

    @Column(name = "outer_moulded")
    private Integer outerMoulded = 0;

    @Column(name = "inner_moulded")
    private Integer innerMoulded = 0;

    @Column(name = "middle_moulded")
    private Integer middleMoulded = 0;

    @Column(name = "felt")
    private Integer felt = 0;

    @Column(name = "ptfe")
    private Integer ptfe = 0;

    @Column(name = "tpu_pu")
    private Integer tpuPu = 0;

    @Column(name = "brass_washer")
    private Integer brassWasher = 0;

    @Column(name = "nut")
    private Integer nut = 0;

    @Column(name = "plastic")
    private Integer plastic = 0;

    @Column(name = "tooted_disc")
    private Integer tootedDisc = 0;

    @Column(name = "foam")
    private Integer foam = 0;

    @Column(name = "gasket")
    private Integer gasket = 0;

    @Column(name = "o_ring")
    private Integer oRing = 0;

    @Column(name = "lock_washer")
    private Integer lockWasher = 0;

    @Column(name = "aluminium_washer")
    private Integer aluminiumWasher = 0;

    @Column(name = "sfg")
    private Integer sfg = 0;

    @Column(name = "big_shim_thin")
    private Integer bigShimThin = 0;

    @Column(name = "small_shim_thin")
    private Integer smallShimThin = 0;

    @Column(name = "big_shim_thick")
    private Integer bigShimThick = 0;

    @Column(name = "small_shim_thick")
    private Integer smallShimThick = 0;

    @Column(name = "split_pin")
    private Integer splitPin = 0;

    @Column(name = "cotton_pin")
    private Integer cottonPin = 0;

    @Column(name = "silicon_rubber")
    private Integer siliconRubber = 0;

    @Column(name = "o_ring_moulded")
    private Integer oRingMoulded = 0;

    @Column(name = "jali")
    private Integer jali = 0;

    public FgBomEntry() {}

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSmsNewPartNo() { return smsNewPartNo; }
    public void setSmsNewPartNo(String smsNewPartNo) { this.smsNewPartNo = smsNewPartNo; }

    public String getOldCode() { return oldCode; }
    public void setOldCode(String oldCode) { this.oldCode = oldCode; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getBomCount() { return bomCount; }
    public void setBomCount(Integer bomCount) { this.bomCount = bomCount; }

    public Integer getOuterMetalShell() { return outerMetalShell; }
    public void setOuterMetalShell(Integer outerMetalShell) { this.outerMetalShell = outerMetalShell; }

    public Integer getInnerMetalShell() { return innerMetalShell; }
    public void setInnerMetalShell(Integer innerMetalShell) { this.innerMetalShell = innerMetalShell; }

    public Integer getSpring() { return spring; }
    public void setSpring(Integer spring) { this.spring = spring; }

    public Integer getMiddleMetalShell() { return middleMetalShell; }
    public void setMiddleMetalShell(Integer middleMetalShell) { this.middleMetalShell = middleMetalShell; }

    public Integer getOuterMoulded() { return outerMoulded; }
    public void setOuterMoulded(Integer outerMoulded) { this.outerMoulded = outerMoulded; }

    public Integer getInnerMoulded() { return innerMoulded; }
    public void setInnerMoulded(Integer innerMoulded) { this.innerMoulded = innerMoulded; }

    public Integer getMiddleMoulded() { return middleMoulded; }
    public void setMiddleMoulded(Integer middleMoulded) { this.middleMoulded = middleMoulded; }

    public Integer getFelt() { return felt; }
    public void setFelt(Integer felt) { this.felt = felt; }

    public Integer getPtfe() { return ptfe; }
    public void setPtfe(Integer ptfe) { this.ptfe = ptfe; }

    public Integer getTpuPu() { return tpuPu; }
    public void setTpuPu(Integer tpuPu) { this.tpuPu = tpuPu; }

    public Integer getBrassWasher() { return brassWasher; }
    public void setBrassWasher(Integer brassWasher) { this.brassWasher = brassWasher; }

    public Integer getNut() { return nut; }
    public void setNut(Integer nut) { this.nut = nut; }

    public Integer getPlastic() { return plastic; }
    public void setPlastic(Integer plastic) { this.plastic = plastic; }

    public Integer getTootedDisc() { return tootedDisc; }
    public void setTootedDisc(Integer tootedDisc) { this.tootedDisc = tootedDisc; }

    public Integer getFoam() { return foam; }
    public void setFoam(Integer foam) { this.foam = foam; }

    public Integer getGasket() { return gasket; }
    public void setGasket(Integer gasket) { this.gasket = gasket; }

    public Integer getORing() { return oRing; }
    public void setORing(Integer oRing) { this.oRing = oRing; }

    public Integer getLockWasher() { return lockWasher; }
    public void setLockWasher(Integer lockWasher) { this.lockWasher = lockWasher; }

    public Integer getAluminiumWasher() { return aluminiumWasher; }
    public void setAluminiumWasher(Integer aluminiumWasher) { this.aluminiumWasher = aluminiumWasher; }

    public Integer getSfg() { return sfg; }
    public void setSfg(Integer sfg) { this.sfg = sfg; }

    public Integer getBigShimThin() { return bigShimThin; }
    public void setBigShimThin(Integer bigShimThin) { this.bigShimThin = bigShimThin; }

    public Integer getSmallShimThin() { return smallShimThin; }
    public void setSmallShimThin(Integer smallShimThin) { this.smallShimThin = smallShimThin; }

    public Integer getBigShimThick() { return bigShimThick; }
    public void setBigShimThick(Integer bigShimThick) { this.bigShimThick = bigShimThick; }

    public Integer getSmallShimThick() { return smallShimThick; }
    public void setSmallShimThick(Integer smallShimThick) { this.smallShimThick = smallShimThick; }

    public Integer getSplitPin() { return splitPin; }
    public void setSplitPin(Integer splitPin) { this.splitPin = splitPin; }

    public Integer getCottonPin() { return cottonPin; }
    public void setCottonPin(Integer cottonPin) { this.cottonPin = cottonPin; }

    public Integer getSiliconRubber() { return siliconRubber; }
    public void setSiliconRubber(Integer siliconRubber) { this.siliconRubber = siliconRubber; }

    public Integer getORingMoulded() { return oRingMoulded; }
    public void setORingMoulded(Integer oRingMoulded) { this.oRingMoulded = oRingMoulded; }

    public Integer getJali() { return jali; }
    public void setJali(Integer jali) { this.jali = jali; }

    /**
     * Returns the component ratio for a given category name.
     * Maps the category name (as used in category_master) to the corresponding BOM field.
     */
    public int getComponentRatio(String categoryName) {
        if (categoryName == null) return 0;
        String cat = categoryName.trim().toUpperCase();
        return switch (cat) {
            case "OUTER METAL SHELL" -> val(outerMetalShell);
            case "INNER METAL SHELL" -> val(innerMetalShell);
            case "SPRING" -> val(spring);
            case "MIDDLE METAL SHELL" -> val(middleMetalShell);
            case "OUTER MOULDED" -> val(outerMoulded);
            case "INNER MOULDED" -> val(innerMoulded);
            case "MIDDLE MOULDED" -> val(middleMoulded);
            case "FELT" -> val(felt);
            case "PTFE" -> val(ptfe);
            case "TPU/PU" -> val(tpuPu);
            case "BRASS WASHER" -> val(brassWasher);
            case "NUT" -> val(nut);
            case "PLASTIC" -> val(plastic);
            case "TOOTED DISC" -> val(tootedDisc);
            case "FOAM" -> val(foam);
            case "GASKET" -> val(gasket);
            case "O-RING" -> val(oRing);
            case "LOCK WASHER" -> val(lockWasher);
            case "ALUMINIUM WASHER" -> val(aluminiumWasher);
            case "SFG" -> val(sfg);
            case "BIG SHIM-THIN" -> val(bigShimThin);
            case "SMALL SHIM-THIN" -> val(smallShimThin);
            case "BIG SHIM-THICK" -> val(bigShimThick);
            case "SMALL SHIM-THICK" -> val(smallShimThick);
            case "SPLIT PIN" -> val(splitPin);
            case "COTTON PIN" -> val(cottonPin);
            case "SILICON RUBBER" -> val(siliconRubber);
            case "O RING MOULDED" -> val(oRingMoulded);
            case "JALI" -> val(jali);
            default -> 0;
        };
    }

    private static int val(Integer v) { return v == null ? 0 : v; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FgBomEntry that = (FgBomEntry) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
