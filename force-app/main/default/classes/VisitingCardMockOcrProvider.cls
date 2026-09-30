/**
 * Default provider for orgs without an external OCR service configured.
 *
 * It performs no text recognition and returns an empty (successful) result:
 * the scan component then relies on the QR code it decodes on the device and
 * on the review / manual-entry form. Swap to the Http provider via the
 * Visiting_Card_Setting__mdt "Default" record to enable real OCR.
 */
public with sharing class VisitingCardMockOcrProvider implements VisitingCardOcrProvider {
    public String getName() {
        return 'Mock (no OCR)';
    }

    public VisitingCardOcrResult extract(String imageBase64, String contentType, String fileName) {
        VisitingCardOcrResult r = new VisitingCardOcrResult();
        r.success = true;
        r.provider = getName();
        r.rawText = '';
        r.fields = new VisitingCardData();
        r.warnings.add('No OCR provider is configured in this org. Card text was not read; details come from the QR code (if any) and manual entry.');
        return r;
    }
}
