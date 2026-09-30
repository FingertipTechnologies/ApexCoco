/**
 * Duplicate detection before Lead creation.
 *
 * Order of signals (Duplicate Handling section of the build spec):
 *   1. Email (exact) on Leads and Contacts
 *   2. Phone / Mobile (trailing digits) on Leads, Contacts and Accounts
 *   3. Company on Leads (Company) and Accounts (Name)
 * Web domain is used as a supporting signal only.
 * No records are modified: the salesperson sees the matches and decides.
 */
public with sharing class LeadDuplicateCheckService {
    public class Match {
        @AuraEnabled public String objectType { get; set; }
        @AuraEnabled public Id recordId { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String detail { get; set; }
        @AuraEnabled public Integer confidence { get; set; }
        @AuraEnabled public List<String> matchedFields { get; set; }
        @AuraEnabled public Boolean isConverted { get; set; }
        public Match() {
            matchedFields = new List<String>();
            isConverted = false;
        }
    }

    public class Result {
        @AuraEnabled public List<Match> leads { get; set; }
        @AuraEnabled public List<Match> contacts { get; set; }
        @AuraEnabled public List<Match> accounts { get; set; }
        @AuraEnabled public Boolean hasMatches { get; set; }
        @AuraEnabled public Integer confidence { get; set; }
        @AuraEnabled public Match bestMatch { get; set; }
        public Result() {
            leads = new List<Match>();
            contacts = new List<Match>();
            accounts = new List<Match>();
            hasMatches = false;
            confidence = 0;
        }
    }

    private static final Integer QUERY_LIMIT = 10;

    public static Result check(VisitingCardData card) {
        Result result = new Result();
        if (card == null) {
            return result;
        }
        String email = String.isBlank(card.email) ? null : card.email.trim().toLowerCase();
        Set<String> phoneKeys = new Set<String>();
        for (String p : new List<String>{ card.mobile, card.phone }) {
            String k = VisitingCardData.phoneKey(p);
            if (k != null) {
                phoneKeys.add(k);
            }
        }
        String companyKey = VisitingCardData.companyKey(card.company);
        String domain = VisitingCardData.domainOf(card.email);
        if (domain == null) {
            domain = VisitingCardData.domainOf(card.website);
        }

        for (Lead l : queryLeads(email, phoneKeys, card.company, domain)) {
            Match m = new Match();
            m.objectType = 'Lead';
            m.recordId = l.Id;
            m.name = joinName(l.FirstName, l.LastName);
            m.detail = joinDetail(l.Title, l.Company);
            m.isConverted = l.IsConverted;
            if (email != null && l.Email != null && l.Email.toLowerCase() == email) { m.matchedFields.add('Email'); }
            if (phoneHit(phoneKeys, l.Phone, l.MobilePhone)) { m.matchedFields.add('Phone'); }
            if (companyKey != null && VisitingCardData.companyKey(l.Company) == companyKey) { m.matchedFields.add('Company'); }
            if (nameHit(card, l.FirstName, l.LastName)) { m.matchedFields.add('Name'); }
            if (domain != null && !m.matchedFields.contains('Email') && (VisitingCardData.domainOf(l.Email) == domain || VisitingCardData.domainOf(l.Website) == domain)) { m.matchedFields.add('Domain'); }
            if (!m.matchedFields.isEmpty()) { m.confidence = score(m.matchedFields); result.leads.add(m); }
        }

        for (Contact c : queryContacts(email, phoneKeys, domain)) {
            Match m = new Match();
            m.objectType = 'Contact';
            m.recordId = c.Id;
            m.name = joinName(c.FirstName, c.LastName);
            m.detail = joinDetail(c.Title, c.Account == null ? null : c.Account.Name);
            if (email != null && c.Email != null && c.Email.toLowerCase() == email) { m.matchedFields.add('Email'); }
            if (phoneHit(phoneKeys, c.Phone, c.MobilePhone)) { m.matchedFields.add('Phone'); }
            if (companyKey != null && c.Account != null && VisitingCardData.companyKey(c.Account.Name) == companyKey) { m.matchedFields.add('Company'); }
            if (nameHit(card, c.FirstName, c.LastName)) { m.matchedFields.add('Name'); }
            if (domain != null && !m.matchedFields.contains('Email') && VisitingCardData.domainOf(c.Email) == domain) { m.matchedFields.add('Domain'); }
            if (!m.matchedFields.isEmpty()) { m.confidence = score(m.matchedFields); result.contacts.add(m); }
        }

        for (Account a : queryAccounts(phoneKeys, card.company, domain)) {
            Match m = new Match();
            m.objectType = 'Account';
            m.recordId = a.Id;
            m.name = a.Name;
            m.detail = joinDetail(a.Industry, a.Type);
            if (companyKey != null && VisitingCardData.companyKey(a.Name) == companyKey) { m.matchedFields.add('Company'); }
            if (domain != null && VisitingCardData.domainOf(a.Website) == domain) { m.matchedFields.add('Website'); }
            if (phoneHit(phoneKeys, a.Phone, null)) { m.matchedFields.add('Phone'); }
            if (!m.matchedFields.isEmpty()) { m.confidence = score(m.matchedFields); result.accounts.add(m); }
        }

        for (Match m : result.contacts) { consider(result, m); }
        for (Match m : result.leads) { consider(result, m); }
        for (Match m : result.accounts) { consider(result, m); }
        result.hasMatches = result.bestMatch != null;
        return result;
    }

    private static void consider(Result r, Match m) {
        if (r.bestMatch == null || m.confidence > r.bestMatch.confidence) {
            r.bestMatch = m;
            r.confidence = m.confidence;
        }
    }

    /** Email 55, Phone 35, Name 25, Company 20, Domain/Website 20 - soft-capped at 99. */
    @TestVisible
    private static Integer score(List<String> matched) {
        Map<String, Integer> weights = new Map<String, Integer>{ 'Email' => 55, 'Phone' => 35, 'Name' => 25, 'Company' => 20, 'Domain' => 20, 'Website' => 25 };
        Integer raw = 0;
        for (String f : matched) {
            Integer w = weights.get(f);
            raw += w == null ? 0 : w;
        }
        // 1 - e^(-2.6 * raw/100), as a percentage
        Double capped = 1 - Math.exp(-2.6 * (raw / 100.0));
        Integer pct = Math.round(capped * 100).intValue();
        return Math.min(99, pct);
    }

    private static Boolean phoneHit(Set<String> keys, String phone, String mobile) {
        if (keys.isEmpty()) {
            return false;
        }
        String pk = VisitingCardData.phoneKey(phone);
        String mk = VisitingCardData.phoneKey(mobile);
        return (pk != null && keys.contains(pk)) || (mk != null && keys.contains(mk));
    }

    private static Boolean nameHit(VisitingCardData card, String first, String last) {
        return String.isNotBlank(card.firstName) && String.isNotBlank(card.lastName) && first != null && last != null
            && first.equalsIgnoreCase(card.firstName) && last.equalsIgnoreCase(card.lastName);
    }

    private static List<Lead> queryLeads(String email, Set<String> phoneKeys, String company, String domain) {
        Integer queryLimit = QUERY_LIMIT;
        List<String> clauses = new List<String>();
        if (email != null) { clauses.add('Email = :email'); }
        List<String> phoneLikes = likePatterns(phoneKeys);
        if (!phoneLikes.isEmpty()) { clauses.add('Phone LIKE :phoneLikes'); clauses.add('MobilePhone LIKE :phoneLikes'); }
        if (String.isNotBlank(company)) { clauses.add('Company = :company'); }
        String domainLike = domain == null ? null : '%' + domain + '%';
        if (domainLike != null) { clauses.add('Email LIKE :domainLike'); clauses.add('Website LIKE :domainLike'); }
        if (clauses.isEmpty()) { return new List<Lead>(); }
        String soql = 'SELECT Id, FirstName, LastName, Title, Company, Email, Phone, MobilePhone, Website, IsConverted FROM Lead WHERE (' + String.join(clauses, ' OR ') + ') ORDER BY LastModifiedDate DESC LIMIT :queryLimit';
        return Database.query(soql);
    }

    private static List<Contact> queryContacts(String email, Set<String> phoneKeys, String domain) {
        Integer queryLimit = QUERY_LIMIT;
        List<String> clauses = new List<String>();
        if (email != null) { clauses.add('Email = :email'); }
        List<String> phoneLikes = likePatterns(phoneKeys);
        if (!phoneLikes.isEmpty()) { clauses.add('Phone LIKE :phoneLikes'); clauses.add('MobilePhone LIKE :phoneLikes'); }
        String domainLike = domain == null ? null : '%@' + domain;
        if (domainLike != null) { clauses.add('Email LIKE :domainLike'); }
        if (clauses.isEmpty()) { return new List<Contact>(); }
        String soql = 'SELECT Id, FirstName, LastName, Title, Email, Phone, MobilePhone, AccountId, Account.Name FROM Contact WHERE (' + String.join(clauses, ' OR ') + ') ORDER BY LastModifiedDate DESC LIMIT :queryLimit';
        return Database.query(soql);
    }

    private static List<Account> queryAccounts(Set<String> phoneKeys, String company, String domain) {
        Integer queryLimit = QUERY_LIMIT;
        List<String> clauses = new List<String>();
        if (String.isNotBlank(company)) { clauses.add('Name = :company'); }
        String domainLike = domain == null ? null : '%' + domain + '%';
        if (domainLike != null) { clauses.add('Website LIKE :domainLike'); }
        List<String> phoneLikes = likePatterns(phoneKeys);
        if (!phoneLikes.isEmpty()) { clauses.add('Phone LIKE :phoneLikes'); }
        if (clauses.isEmpty()) { return new List<Account>(); }
        String soql = 'SELECT Id, Name, Website, Phone, Industry, Type FROM Account WHERE (' + String.join(clauses, ' OR ') + ') ORDER BY LastModifiedDate DESC LIMIT :queryLimit';
        return Database.query(soql);
    }

    /** Phone fields are free text in Salesforce, so match on the trailing 7 digits with LIKE and verify in Apex. */
    private static List<String> likePatterns(Set<String> phoneKeys) {
        List<String> patterns = new List<String>();
        for (String k : phoneKeys) {
            String tail = k.length() > 7 ? k.substring(k.length() - 7) : k;
            // Allow common separators between the last digits: "%7","%2","%2","%5","%5"
            String pattern = '%';
            for (Integer i = 0; i < tail.length(); i++) {
                pattern += tail.substring(i, i + 1) + (i < tail.length() - 1 ? '%' : '');
            }
            patterns.add(pattern);
        }
        return patterns;
    }

    private static String joinName(String first, String last) {
        return String.isBlank(first) ? last : (first + ' ' + (last == null ? '' : last)).trim();
    }

    private static String joinDetail(String a, String b) {
        List<String> parts = new List<String>();
        if (String.isNotBlank(a)) { parts.add(a); }
        if (String.isNotBlank(b)) { parts.add(b); }
        return String.join(parts, ' · ');
    }
}
