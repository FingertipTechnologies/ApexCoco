/**
 * OCR / Scanning Implementation Contract.
 *
 * Every OCR engine sits behind this interface so the rest of the Lead
 * lifecycle never depends on a specific vendor. Register new implementations
 * in VisitingCardOcrService.newProvider().
 */
public interface VisitingCardOcrProvider {
    /** Human-readable engine name stored on Lead.Scan_Provider__c for audit. */
    String getName();

    /**
     * @param imageBase64  Base64-encoded image captured from the mobile camera or uploaded.
     * @param contentType  MIME type, e.g. image/jpeg.
     * @param fileName     Original file name (may be null).
     */
    VisitingCardOcrResult extract(String imageBase64, String contentType, String fileName);
}
