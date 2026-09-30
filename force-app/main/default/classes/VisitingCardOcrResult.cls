/**
 * Output of an OCR provider. Providers may return raw text only, structured
 * fields only, or both; the scan component merges whatever is available with
 * QR-code data decoded on the device and its own text parser.
 */
public with sharing class VisitingCardOcrResult {
    @AuraEnabled public Boolean success { get; set; }
    @AuraEnabled public String provider { get; set; }
    @AuraEnabled public String rawText { get; set; }
    @AuraEnabled public Decimal confidence { get; set; }
    @AuraEnabled public VisitingCardData fields { get; set; }
    @AuraEnabled public String errorMessage { get; set; }
    @AuraEnabled public List<String> warnings { get; set; }

    public VisitingCardOcrResult() {
        success = false;
        warnings = new List<String>();
    }

    public static VisitingCardOcrResult failure(String provider, String message) {
        VisitingCardOcrResult r = new VisitingCardOcrResult();
        r.provider = provider;
        r.errorMessage = message;
        return r;
    }

    public Boolean hasText() {
        return String.isNotBlank(rawText);
    }

    public Boolean hasFields() {
        return fields != null && (fields.hasName() || fields.hasAnyContactDetail() || String.isNotBlank(fields.company));
    }
}
