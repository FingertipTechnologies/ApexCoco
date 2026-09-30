/**
 * Calls an external OCR / extraction service over HTTPS through a Named
 * Credential. The reference implementation of that service lives in this
 * repository under /ocr-service (POST /api/extract), but any service that
 * honours the JSON contract below can be used:
 *
 *   Request : { "imageBase64": "...", "contentType": "image/jpeg", "fileName": "card.jpg" }
 *   Response: { "contact": { firstName, lastName, jobTitle, company, mobile, phone, email, website, country, ... },
 *               "rawText": "...", "ocrConfidence": 92, "pipeline": { "ocrProvider": "tesseract.js" }, "warnings": [] }
 */
public with sharing class VisitingCardHttpOcrProvider implements VisitingCardOcrProvider {
    private final String namedCredential;
    private final String path;
    private final Integer timeoutSeconds;

    public VisitingCardHttpOcrProvider(String namedCredential, String path, Integer timeoutSeconds) {
        this.namedCredential = String.isBlank(namedCredential) ? 'Visiting_Card_OCR' : namedCredential;
        this.path = String.isBlank(path) ? '/api/extract' : path;
        this.timeoutSeconds = (timeoutSeconds == null || timeoutSeconds <= 0) ? 60 : Math.min(timeoutSeconds, 120);
    }

    public String getName() {
        return 'HTTP OCR service (' + namedCredential + ')';
    }

    public VisitingCardOcrResult extract(String imageBase64, String contentType, String fileName) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + namedCredential + path);
        req.setMethod('POST');
        req.setTimeout(timeoutSeconds * 1000);
        req.setHeader('Content-Type', 'application/json');
        // The service API key is stored as the Named Credential password (Setup > Named Credentials).
        req.setHeader('x-api-key', '{!$Credential.Password}');
        req.setBody(JSON.serialize(new Map<String, Object>{
            'imageBase64' => imageBase64,
            'contentType' => contentType,
            'fileName' => fileName
        }));

        HttpResponse res;
        try {
            res = new Http().send(req);
        } catch (Exception e) {
            return VisitingCardOcrResult.failure(getName(), 'OCR service unreachable: ' + e.getMessage());
        }
        if (res.getStatusCode() < 200 || res.getStatusCode() >= 300) {
            return VisitingCardOcrResult.failure(getName(), 'OCR service returned HTTP ' + res.getStatusCode() + ': ' + shortBody(res.getBody()));
        }
        return parse(res.getBody());
    }

    @TestVisible
    private VisitingCardOcrResult parse(String body) {
        VisitingCardOcrResult r = new VisitingCardOcrResult();
        r.provider = getName();
        try {
            Map<String, Object> json = (Map<String, Object>) JSON.deserializeUntyped(body);
            Object contact = json.get('contact');
            r.fields = contact instanceof Map<String, Object> ? VisitingCardData.fromMap((Map<String, Object>) contact) : new VisitingCardData();
            r.rawText = json.get('rawText') == null ? '' : String.valueOf(json.get('rawText'));
            if (json.get('ocrConfidence') != null) {
                r.confidence = Decimal.valueOf(String.valueOf(json.get('ocrConfidence')));
            }
            Object pipeline = json.get('pipeline');
            if (pipeline instanceof Map<String, Object>) {
                Object engine = ((Map<String, Object>) pipeline).get('ocrProvider');
                if (engine != null) {
                    r.provider = String.valueOf(engine) + ' via ' + namedCredential;
                }
            }
            Object warnings = json.get('warnings');
            if (warnings instanceof List<Object>) {
                for (Object w : (List<Object>) warnings) {
                    r.warnings.add(String.valueOf(w));
                }
            }
            r.success = true;
        } catch (Exception e) {
            return VisitingCardOcrResult.failure(getName(), 'OCR service response could not be read: ' + e.getMessage());
        }
        return r;
    }

    private static String shortBody(String body) {
        if (body == null) {
            return '';
        }
        return body.length() > 200 ? body.substring(0, 200) : body;
    }
}
