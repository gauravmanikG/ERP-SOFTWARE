package com.silvermuller.seals.modules.purchase.newpo;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guard for the PR -> PO -> GRN flow: the new purchase code must not depend on PR clubbing or batch purchasing.
 * Reads the source of the newpo package (no database). Fails if a clubbing or batch dependency is introduced.
 */
class NewFlowIndependenceTest {

    private static final List<String> FORBIDDEN = List.of(
            "PrClubbingService", "PrClubbingController", "pr_clubbing", "clubbing_batch", "pr_clubbing_batches",
            "CreateClubbingBatchRequest", "ConsolidatedEligibleItemDto", "PrClubbingAllocation");

    @Test
    void newPoPackageDoesNotReferenceClubbingOrBatchCode() throws IOException {
        Path dir = Path.of("src/main/java/com/silvermuller/seals/modules/purchase/newpo");
        assertTrue(Files.isDirectory(dir), "run from the backend directory: " + dir.toAbsolutePath());
        try (Stream<Path> files = Files.list(dir)) {
            for (Path f : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                String src = Files.readString(f);
                for (String word : FORBIDDEN) {
                    assertTrue(!src.contains(word), f.getFileName() + " must not depend on clubbing/batch code (" + word + ")");
                }
            }
        }
    }
}
