/**
 * Structured person / company / contact fields captured from a visiting card.
 * This is the contract between the scan LWC, the OCR adapter, the duplicate
 * check and Lead creation (OCR / Scanning Implementation Contract: Output).
 */
public with sharing class VisitingCardData {
    @AuraEnabled public String firstName { get; set; }
    @AuraEnabled public String lastName { get; set; }
    @AuraEnabled public String title { get; set; }
    @AuraEnabled public String company { get; set; }
    @AuraEnabled public String email { get; set; }
    @AuraEnabled public String phone { get; set; }
    @AuraEnabled public String mobile { get; set; }
    @AuraEnabled public String website { get; set; }
    @AuraEnabled public String country { get; set; }
    @AuraEnabled public String leadSource { get; set; }
    @AuraEnabled public String eventName { get; set; }

    public VisitingCardData() {}

    /** Builds the data object from a loosely typed map (e.g. an LWC payload or an OCR JSON response). */
    public static VisitingCardData fromMap(Map<String, Object> source) {
        VisitingCardData d = new VisitingCardData();
        if (source == null) {
            return d;
        }
        d.firstName = clean(source.get('firstName'));
        d.lastName = clean(source.get('lastName'));
        d.title = clean(source.get('title') != null ? source.get('title') : source.get('jobTitle'));
        d.company = clean(source.get('company'));
        d.email = clean(source.get('email'));
        if (d.email != null) {
            d.email = d.email.toLowerCase();
        }
        d.phone = clean(source.get('phone'));
        d.mobile = clean(source.get('mobile'));
        d.website = clean(source.get('website'));
        d.country = clean(source.get('country'));
        d.leadSource = clean(source.get('leadSource'));
        d.eventName = clean(source.get('eventName'));
        return d;
    }

    public Boolean hasName() {
        return String.isNotBlank(firstName) || String.isNotBlank(lastName);
    }

    public Boolean hasAnyContactDetail() {
        return String.isNotBlank(email) || String.isNotBlank(phone) || String.isNotBlank(mobile);
    }

    /** Digits only, e.g. "+91 94950 72255" -> "919495072255". */
    public static String digitsOnly(String value) {
        if (String.isBlank(value)) {
            return null;
        }
        String digits = value.replaceAll('[^0-9]', '');
        return String.isBlank(digits) ? null : digits;
    }

    /** Trailing 10 digits so that "+91 94950 72255" and "9495072255" compare equal. */
    public static String phoneKey(String value) {
        String digits = digitsOnly(value);
        if (digits == null || digits.length() < 7) {
            return null;
        }
        return digits.length() > 10 ? digits.substring(digits.length() - 10) : digits;
    }

    /** Company domain from an email or website; null for webmail domains. */
    public static String domainOf(String emailOrUrl) {
        if (String.isBlank(emailOrUrl)) {
            return null;
        }
        String host = emailOrUrl.trim().toLowerCase();
        if (host.contains('@')) {
            host = host.substringAfter('@');
        }
        host = host.replaceFirst('^https?://', '').replaceFirst('^www\\.', '');
        host = host.substringBefore('/');
        Set<String> generic = new Set<String>{ 'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'protonmail.com', 'aol.com' };
        if (String.isBlank(host) || generic.contains(host) || !host.contains('.')) {
            return null;
        }
        return host;
    }

    /** Lower-cased company name without legal suffixes, for matching. */
    public static String companyKey(String name) {
        if (String.isBlank(name)) {
            return null;
        }
        String key = name.toLowerCase().replaceAll('[.,]', ' ');
        key = key.replaceAll('\\b(inc|ltd|llc|llp|plc|pvt|private|limited|corp|corporation|co|company|gmbh|technologies|technology|solutions|international)\\b', ' ');
        key = key.replaceAll('\\s+', ' ').trim();
        return String.isBlank(key) ? null : key;
    }

    private static String clean(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return String.isBlank(s) ? null : s;
    }
}
