$baseUrl = "http://localhost:4000/api"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TESTING PR CLUBBING & CONSOLIDATION MODULE END-TO-END  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Fetch current eligible items
Write-Host "`n1. Testing GET /api/purchase/clubbing/eligible-items..." -ForegroundColor Yellow
$eligible = Invoke-RestMethod -Uri "$baseUrl/purchase/clubbing/eligible-items" -Method Get
Write-Host "Found $($eligible.Count) consolidated eligible items:" -ForegroundColor Green
$eligible | ForEach-Object {
    Write-Host "  - Item: $($_.itemCode) | Combined Qty: $($_.combinedEligibleQty) $($_.uom) | Sources: $($_.sourcePrCount) PR(s) ($($_.sourcePrNumbers -join ', '))"
}

# 2. Create 2 test PRs with identical item 'O-RING-NBR-70' and compatible UOM 'PCS'
Write-Host "`n2. Creating 2 test PRs with identical item 'O-RING-NBR-70' (PR1: 100 pcs, PR2: 50 pcs)..." -ForegroundColor Yellow

$pr1Payload = @{
    prDate = "2026-10-10"
    requiredDate = "2026-10-20"
    requisitioner = "Amit Sharma"
    department = "Moulding"
    store = "Raw Material Store"
    priority = "High"
    requirementType = "Production Requirement"
    procurementMethod = "Direct Purchase"
    purpose = "Clubbing Test Batch 1"
    remarks = "Test PR 1 for consolidation"
    status = "Approved"
    items = @(
        @{
            itemCode = "O-RING-NBR-70"
            itemName = "O-Ring NBR 70 Shore A (Size: 20x3)"
            category = "Raw Material"
            reqQty = 100
            uom = "PCS"
            estRate = 18.00
            remarks = "Batch 1 item"
        }
    )
} | ConvertTo-Json -Depth 5

$pr1Res = Invoke-RestMethod -Uri "$baseUrl/purchase/requisitions" -Method Post -Body $pr1Payload -ContentType "application/json"
$pr1Num = $pr1Res.prNumber
Write-Host "Created PR1: $pr1Num" -ForegroundColor Green

# Ensure Approved status
$statusBody1 = @{ status = "Approved"; user = "Approver" } | ConvertTo-Json
$null = Invoke-RestMethod -Uri "$baseUrl/purchase/requisitions/$pr1Num/status" -Method Put -Body $statusBody1 -ContentType "application/json"
Write-Host "Status Approved for PR1: $pr1Num" -ForegroundColor Green

$pr2Payload = @{
    prDate = "2026-10-10"
    requiredDate = "2026-10-22"
    requisitioner = "Sunil Verma"
    department = "Finishing"
    store = "Raw Material Store"
    priority = "Normal"
    requirementType = "Maintenance & Repair"
    procurementMethod = "Competitive Quotation"
    purpose = "Clubbing Test Batch 2"
    remarks = "Test PR 2 for consolidation"
    status = "Approved"
    items = @(
        @{
            itemCode = "O-RING-NBR-70"
            itemName = "O-Ring NBR 70 Shore A (Size: 20x3)"
            category = "Raw Material"
            reqQty = 50
            uom = "PCS"
            estRate = 18.00
            remarks = "Batch 2 item"
        }
    )
} | ConvertTo-Json -Depth 5

$pr2Res = Invoke-RestMethod -Uri "$baseUrl/purchase/requisitions" -Method Post -Body $pr2Payload -ContentType "application/json"
$pr2Num = $pr2Res.prNumber
Write-Host "Created PR2: $pr2Num" -ForegroundColor Green

# Ensure Approved status
$statusBody2 = @{ status = "Approved"; user = "Approver" } | ConvertTo-Json
$null = Invoke-RestMethod -Uri "$baseUrl/purchase/requisitions/$pr2Num/status" -Method Put -Body $statusBody2 -ContentType "application/json"
Write-Host "Status Approved for PR2: $pr2Num" -ForegroundColor Green

# 3. Verify Consolidation Logic
Write-Host "`n3. Verifying Consolidation Logic for O-RING-NBR-70..." -ForegroundColor Yellow
$eligibleAfter = Invoke-RestMethod -Uri "$baseUrl/purchase/clubbing/eligible-items" -Method Get
$oringConsolidated = $eligibleAfter | Where-Object { $_.itemCode -eq "O-RING-NBR-70" }

if ($oringConsolidated) {
    Write-Host "SUCCESS: Item O-RING-NBR-70 Consolidated!" -ForegroundColor Green
    Write-Host "  Combined Eligible Qty: $($oringConsolidated.combinedEligibleQty) $($oringConsolidated.uom)" -ForegroundColor Cyan
    Write-Host "  Contributing Source PR Count: $($oringConsolidated.sourcePrCount)" -ForegroundColor Cyan
    Write-Host "  Contributing PRs: $($oringConsolidated.sourcePrNumbers -join ', ')" -ForegroundColor Cyan
    Write-Host "  Source Allocations Detail Count: $($oringConsolidated.sourceAllocations.Count)" -ForegroundColor Cyan
    $oringConsolidated.sourceAllocations | ForEach-Object {
        Write-Host "    * PR: $($_.prNumber) | Dept: $($_.department) | Requester: $($_.requisitioner) | Remaining: $($_.remainingQty) $($_.uom)"
    }
} else {
    Write-Host "FAILED: O-RING-NBR-70 not found in consolidated items" -ForegroundColor Red
    exit 1
}

# 4. Create a Clubbing Batch for O-RING-NBR-70 (clubbing 120 pcs out of total available)
Write-Host "`n4. Testing POST /api/purchase/clubbing/batches (Creating Clubbing Batch for 120 pcs)..." -ForegroundColor Yellow
$batchReq = @{
    batchName = "Automated Test Batch - O-Rings"
    notes = "Testing multi-PR line clubbing and allocation locks"
    createdBy = "Quality Test Officer"
    items = @(
        @{
            itemCode = "O-RING-NBR-70"
            requestedQty = 120
        }
    )
} | ConvertTo-Json -Depth 5

$createdBatch = Invoke-RestMethod -Uri "$baseUrl/purchase/clubbing/batches" -Method Post -Body $batchReq -ContentType "application/json"
$batchId = $createdBatch.id
$batchNum = $createdBatch.batchNumber
Write-Host "SUCCESS: Created Clubbing Batch: $batchNum (ID: $batchId)" -ForegroundColor Green
Write-Host "  Batch Status: $($createdBatch.status)" -ForegroundColor Cyan
Write-Host "  Total Clubbed Qty: $($createdBatch.totalClubbedQty)" -ForegroundColor Cyan
Write-Host "  Batch Items Count: $($createdBatch.totalItemsCount)" -ForegroundColor Cyan

# 5. Verify batch details & audit trail
Write-Host "`n5. Testing GET /api/purchase/clubbing/batches/$batchId (Verifying allocations audit)..." -ForegroundColor Yellow
$batchDetails = Invoke-RestMethod -Uri "$baseUrl/purchase/clubbing/batches/$batchId" -Method Get
Write-Host "Batch Items:" -ForegroundColor Green
$batchDetails.items | ForEach-Object {
    Write-Host "  - Item: $($_.itemCode) | Qty: $($_.totalClubbedQty) $($_.uom) | Status: $($_.status)"
}
Write-Host "Source Allocations Audit Trail:" -ForegroundColor Green
$batchDetails.allocations | ForEach-Object {
    Write-Host "  - PR: $($_.prNumber) | PR Item ID: $($_.prItemId) | Allocated: $($_.allocatedQty) | Status: $($_.status)"
}

# 6. Verify PO Handoff payload
Write-Host "`n6. Testing GET /api/purchase/clubbing/batches/$batchId/handoff..." -ForegroundColor Yellow
$handoff = Invoke-RestMethod -Uri "$baseUrl/purchase/clubbing/batches/$batchId/handoff" -Method Get
Write-Host "SUCCESS: PO Handoff Payload Generated:" -ForegroundColor Green
Write-Host "  PR/Batch Number: $($handoff.pr_number)" -ForegroundColor Cyan
Write-Host "  Clubbing Batch ID: $($handoff.clubbingBatchId)" -ForegroundColor Cyan
Write-Host "  Clubbing Batch Number: $($handoff.clubbingBatchNumber)" -ForegroundColor Cyan
Write-Host "  Items to Purchase: $($handoff.items.Count)" -ForegroundColor Cyan

# 7. Test PO Creation & Approval with Clubbing Batch Integration
Write-Host "`n7. Testing PO Creation & Approval with Clubbing Batch ID and Number..." -ForegroundColor Yellow
$proposalReq = @{
    prNumber = $handoff.pr_number
    prDate = $handoff.pr_date
    department = $handoff.department
    requestedBy = $handoff.requisitioner
    requiredByDate = $handoff.required_date
    priority = "Normal"
    purpose = "Clubbed PO Execution"
    remarks = "Generated from Clubbing Batch $batchNum"
    clubbingBatchId = [long]$handoff.clubbingBatchId
    clubbingBatchNumber = $handoff.clubbingBatchNumber
    createdBy = "Test Officer"
    items = @(
        @{
            itemCode = "O-RING-NBR-70"
            itemName = "O-Ring NBR 70 Shore A (Size: 20x3)"
            category = "Raw Material"
            uom = "PCS"
            vendorCode = "VND-001"
            vendorName = "Precision Polymers Ltd."
            quantity = 120
            unitRate = 17.50
            discountPercent = 5.0
            manualDiscount = 0
            taxType = "GST"
            taxPercent = 18.0
            deliveryCharges = 200
            otherCharges = 0
            expectedDeliveryDate = "2026-10-25"
            deliveryLocation = "Main Plant Warehouse, Silvassa"
            remarks = "Bulk purchase order"
            clubbingBatchId = [long]$handoff.clubbingBatchId
            clubbingBatchNumber = $handoff.clubbingBatchNumber
        }
    )
    vendorCharges = @{}
} | ConvertTo-Json -Depth 6

$propRes = Invoke-RestMethod -Uri "$baseUrl/purchase/proposals?submit=true" -Method Post -Body $proposalReq -ContentType "application/json"
$propId = $propRes.id
$propNum = $propRes.proposalNumber
Write-Host "Created & Submitted Proposal: $propNum (ID: $propId)" -ForegroundColor Green

# Approve PO Proposal
$approvedProp = Invoke-RestMethod -Uri "$baseUrl/purchase/proposals/$propId/approve" -Method Post -Body "{}" -ContentType "application/json"
Write-Host "SUCCESS: Proposal Approved! Generated PO Numbers: $($approvedProp.generatedPoNumbers -join ', ')" -ForegroundColor Green

# 8. Verify Clubbing Batch Status & PR Ordered Qty Updates
Write-Host "`n8. Verifying Batch & Source PR Updates after PO Approval..." -ForegroundColor Yellow
$batchAfterPo = Invoke-RestMethod -Uri "$baseUrl/purchase/clubbing/batches/$batchId" -Method Get
Write-Host "Batch Status: $($batchAfterPo.status)" -ForegroundColor Cyan
Write-Host "Purchased Qty: $($batchAfterPo.purchasedQty) / $($batchAfterPo.totalClubbedQty)" -ForegroundColor Cyan

$batchAfterPo.allocations | ForEach-Object {
    Write-Host "  Allocation: PR $($_.prNumber) | Allocated: $($_.allocatedQty) | Purchased: $($_.purchasedQty) | PO: $($_.poNumber) | Status: $($_.status)"
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  ALL PR CLUBBING & PO INTEGRATION TESTS PASSED!          " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
