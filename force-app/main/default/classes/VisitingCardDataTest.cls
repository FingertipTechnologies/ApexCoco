@IsTest
private class VisitingCardDataTest {
    @IsTest
    static void normalisers() {
        System.assertEquals('9495072255', VisitingCardData.phoneKey('+91 94950 72255'));
        System.assertEquals('9495072255', VisitingCardData.phoneKey('9495072255'));
        System.assertEquals(null, VisitingCardData.phoneKey('123'));
        System.assertEquals(null, VisitingCardData.phoneKey(null));

        System.assertEquals('fingertipplus.com', VisitingCardData.domainOf('ameen@fingertipplus.com'));
        System.assertEquals('fingertipplus.com', VisitingCardData.domainOf('https://www.fingertipplus.com/team'));
        System.assertEquals(null, VisitingCardData.domainOf('someone@gmail.com'));
        System.assertEquals(null, VisitingCardData.domainOf(''));

        System.assertEquals('abc foods', VisitingCardData.companyKey('ABC Foods International'));
        System.assertEquals('fingertip', VisitingCardData.companyKey('Fingertip Technologies Pvt. Ltd.'));
        System.assertEquals(null, VisitingCardData.companyKey('  '));
    }

    @IsTest
    static void fromMapTrimsAndMapsAliases() {
        VisitingCardData d = VisitingCardData.fromMap(new Map<String, Object>{
            'firstName' => ' John ', 'lastName' => 'Smith', 'jobTitle' => 'Procurement Manager', 'company' => 'ABC Foods International',
            'email' => 'John.Smith@ABCFoods.com', 'phone' => '+1 555 0100', 'website' => 'abcfoods.com', 'country' => 'USA', 'eventName' => 'Gulfood 2026', 'leadSource' => ''
        });
        System.assertEquals('John', d.firstName);
        System.assertEquals('Procurement Manager', d.title);
        System.assertEquals('john.smith@abcfoods.com', d.email);
        System.assertEquals('Gulfood 2026', d.eventName);
        System.assertEquals(null, d.leadSource, 'blank becomes null');
        System.assertEquals(true, d.hasName());
        System.assertEquals(true, d.hasAnyContactDetail());
        System.assertEquals(false, VisitingCardData.fromMap(null).hasName());
    }
}
