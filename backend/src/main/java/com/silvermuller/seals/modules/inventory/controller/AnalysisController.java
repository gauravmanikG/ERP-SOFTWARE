package com.silvermuller.seals.modules.inventory.controller;

import com.silvermuller.seals.modules.inventory.dto.DepartmentStockResponse;
import com.silvermuller.seals.modules.inventory.dto.DepartmentWiseCbResponse;
import com.silvermuller.seals.modules.inventory.service.AnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory/analysis")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @GetMapping("/department-wise-cb")
    public ResponseEntity<DepartmentWiseCbResponse> departmentWiseCb(
            @RequestParam("code") String code,
            @RequestParam("category") String category) {
        return ResponseEntity.ok(analysisService.getDepartmentWiseCb(code, category));
    }

    @GetMapping("/department-stock")
    public ResponseEntity<DepartmentStockResponse> departmentStock(@RequestParam("departmentId") Long departmentId) {
        return ResponseEntity.ok(analysisService.getStockByDepartment(departmentId));
    }
}
