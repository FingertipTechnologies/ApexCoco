@IsTest
private class VisitingCardOcrServiceTest {
    private class OkMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            System.assert(req.getEndpoint().startsWith('callout:Visiting_Card_OCR/api/extract'), 'Endpoint should use the Named Credential');
            System.assertEquals('POST', req.getMethod());
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.getBody());
            System.assertEquals('image/png', body.get('contentType'));
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"contact":{"firstName":"Ameen","lastName":"Azeez","jobTitle":"Chief Revenue Officer","company":"Fingertip","mobile":"9495072255","email":"AMEEN@fingertipplus.com","website":"https://www.fingertipplus.com"},'
                + '"rawText":"Ameen Azeez\\nChief Revenue Officer","ocrConfidence":92,"pipeline":{"ocrProvider":"tesseract.js","qrDetected":true},"warnings":["low light"]}');
            return res;
        }
    }

    private class ErrorMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(500);
            res.setBody('boom');
            return res;
        }
    }

    private class ThrowingProvider implements VisitingCardOcrProvider {
        public String getName() { return 'Throwing'; }
        public VisitingCardOcrResult extract(String b, String c, String f) { throw new IllegalArgumentException('engine crashed'); }
    }

    @IsTest
    static void mockProviderReturnsEmptySuccessfulResult() {
        VisitingCardOcrService.providerOverride = new VisitingCardMockOcrProvider();
        VisitingCardOcrResult r = VisitingCardOcrService.extract('aGVsbG8=', 'image/jpeg', 'card.jpg');
        System.assertEquals(true, r.success);
        System.assertEquals(false, r.hasText());
        System.assertEquals(false, r.hasFields());
        System.assertEquals('Mock (no OCR)', r.provider);
        System.assertEquals(1, r.warnings.size());
    }

    @IsTest
    static void httpProviderParsesServiceResponse() {
        Test.setMock(HttpCalloutMock.class, new OkMock());
        VisitingCardOcrService.providerOverride = new VisitingCardHttpOcrProvider('Visiting_Card_OCR', '/api/extract', 30);
        Test.startTest();
        VisitingCardOcrResult r = VisitingCardOcrService.extract('aGVsbG8=', 'image/png', 'card.png');
        Test.stopTest();
        System.assertEquals(true, r.success, r.errorMessage);
        System.assertEquals('Ameen', r.fields.firstName);
        System.assertEquals('Azeez', r.fields.lastName);
        System.assertEquals('Chief Revenue Officer', r.fields.title, 'jobTitle maps to title');
        System.assertEquals('ameen@fingertipplus.com', r.fields.email, 'email is lower-cased');
        System.assertEquals('9495072255', r.fields.mobile);
        System.assertEquals(92, r.confidence);
        System.assert(r.rawText.contains('Ameen Azeez'));
        System.assert(r.provider.startsWith('tesseract.js via'), r.provider);
        System.assertEquals(1, r.warnings.size());
        System.assertEquals(true, r.hasFields());
    }

    @IsTest
    static void httpProviderReportsHttpErrorsWithoutThrowing() {
        Test.setMock(HttpCalloutMock.class, new ErrorMock());
        VisitingCardOcrService.providerOverride = new VisitingCardHttpOcrProvider(null, null, null);
        Test.startTest();
        VisitingCardOcrResult r = VisitingCardOcrService.extract('aGVsbG8=', 'image/jpeg', null);
        Test.stopTest();
        System.assertEquals(false, r.success);
        System.assert(r.errorMessage.contains('HTTP 500'), r.errorMessage);
    }

    @IsTest
    static void httpProviderHandlesMalformedJson() {
        VisitingCardHttpOcrProvider p = new VisitingCardHttpOcrProvider('Visiting_Card_OCR', '/api/extract', 10);
        VisitingCardOcrResult r = p.parse('not json');
        System.assertEquals(false, r.success);
        System.assert(r.errorMessage.contains('could not be read'));
    }

    @IsTest
    static void providerExceptionsBecomeFailureResults() {
        VisitingCardOcrService.providerOverride = new ThrowingProvider();
        VisitingCardOcrResult r = VisitingCardOcrService.extract('aGVsbG8=', 'image/jpeg', null);
        System.assertEquals(false, r.success);
        System.assertEquals('Throwing', r.provider);
        System.assert(r.errorMessage.contains('engine crashed'));
    }

    @IsTest
    static void blankImageFailsFast() {
        VisitingCardOcrResult r = VisitingCardOcrService.extract('', 'image/jpeg', null);
        System.assertEquals(false, r.success);
    }

    @IsTest
    static void factoryHonoursSettingRecord() {
        Visiting_Card_Setting__mdt httpSetting = new Visiting_Card_Setting__mdt(OCR_Provider__c = 'Http', Named_Credential__c = 'Visiting_Card_OCR', Endpoint_Path__c = '/api/extract', Timeout_Seconds__c = 45);
        System.assert(VisitingCardOcrService.newProvider(httpSetting) instanceof VisitingCardHttpOcrProvider);
        Visiting_Card_Setting__mdt mockSetting = new Visiting_Card_Setting__mdt(OCR_Provider__c = 'Mock');
        System.assert(VisitingCardOcrService.newProvider(mockSetting) instanceof VisitingCardMockOcrProvider);
        System.assert(VisitingCardOcrService.newProvider(null) instanceof VisitingCardMockOcrProvider, 'No setting defaults to Mock');
        System.assertNotEquals(null, VisitingCardOcrService.getProvider(), 'Deployed Default record resolves a provider');
    }
}
