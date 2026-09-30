/**
 * Resolves the configured OCR provider (Visiting_Card_Setting__mdt "Default")
 * and runs extraction. Never throws to the UI: failures come back as a result
 * with success = false so the component can offer manual entry.
 */
public with sharing class VisitingCardOcrService {
    public static final String SETTING_NAME = 'Default';

    @TestVisible
    private static VisitingCardOcrProvider providerOverride;

    public static VisitingCardOcrProvider getProvider() {
        if (providerOverride != null) {
            return providerOverride;
        }
        Visiting_Card_Setting__mdt setting = Visiting_Card_Setting__mdt.getInstance(SETTING_NAME);
        return newProvider(setting);
    }

    /** Factory: add new engines here (e.g. 'GoogleVision' => new GoogleVisionOcrProvider(...)). */
    public static VisitingCardOcrProvider newProvider(Visiting_Card_Setting__mdt setting) {
        String kind = setting == null || String.isBlank(setting.OCR_Provider__c) ? 'Mock' : setting.OCR_Provider__c;
        if (kind == 'Http') {
            Integer timeoutSeconds = setting.Timeout_Seconds__c == null ? null : setting.Timeout_Seconds__c.intValue();
            return new VisitingCardHttpOcrProvider(setting.Named_Credential__c, setting.Endpoint_Path__c, timeoutSeconds);
        }
        return new VisitingCardMockOcrProvider();
    }

    public static VisitingCardOcrResult extract(String imageBase64, String contentType, String fileName) {
        if (String.isBlank(imageBase64)) {
            return VisitingCardOcrResult.failure('none', 'No image was supplied.');
        }
        VisitingCardOcrProvider provider = getProvider();
        try {
            VisitingCardOcrResult result = provider.extract(imageBase64, contentType, fileName);
            if (result == null) {
                return VisitingCardOcrResult.failure(provider.getName(), 'Provider returned no result.');
            }
            if (result.provider == null) {
                result.provider = provider.getName();
            }
            return result;
        } catch (Exception e) {
            return VisitingCardOcrResult.failure(provider.getName(), e.getMessage());
        }
    }
}
