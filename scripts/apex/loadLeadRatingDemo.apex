/**
 * Apex Coco - Lead management demo leads (Rating Indicator, Lead Aging, Hot/Warm/Cold, Action Today, This Week Closing).
 * Idempotent: leads are matched by Company + Last Name and updated if they already exist.
 * Lead Aging is a formula on CreatedDate, so freshly loaded leads show 0; it grows by one every day the org keeps them.
 *
 *   sf apex run --file scripts/apex/loadLeadRatingDemo.apex --target-org <alias>
 */
final String MARK = 'APEX DEMO DATA';
Date today = Date.today();
Set<String> statuses = new Set<String>();
for (LeadStatus ls : [SELECT MasterLabel FROM LeadStatus WHERE IsConverted = false]) { statuses.add(ls.MasterLabel); }
String stNew = statuses.contains('New') ? 'New' : new List<String>(statuses)[0];
String stEngaged = statuses.contains('Engaged') ? 'Engaged' : (statuses.contains('Working - Contacted') ? 'Working - Contacted' : stNew);
String stQualified = statuses.contains('Qualified') ? 'Qualified' : stNew;

List<Lead> wanted = new List<Lead>{
    new Lead(FirstName = 'Amit', LastName = 'Joshi', Company = 'Healthy Earth Foods', Title = 'Purchase Head', Designation__c = 'Purchase Head',
        Email = 'amit.joshi@healthyearth.example', Phone = '+91 80 4000 1201', MobilePhone = '+91 98450 11201', WhatsApp_Number__c = '+91 98450 11201',
        Country = 'India', Country__c = 'India', LeadSource = 'Trade Show', Status = stNew, Rating = 'Hot', Industry = 'Food & Beverage',
        Company_Type__c = 'Brand Owner', Customer_Type__c = 'Brand Owner', Potential_Category__c = 'High', Buying_Intent__c = 'Immediate Purchase', Purchase_Timeline__c = 'Immediate',
        Estimated_Annual_Volume__c = 240, Expected_Monthly_Volume__c = 20, Lead_Classification__c = 'Potential Customer',
        Last_Contact_Date__c = today.addDays(-2), Next_Followup_Date__c = today, Preferred_Communication__c = 'Phone', Customer_Response__c = 'Interested',
        AI_Lead_Score__c = 88, Lead_Health__c = 'High', Description = MARK),
    new Lead(FirstName = 'Priya', LastName = 'Nair', Company = 'Green Valley Organics', Title = 'Sourcing Manager', Designation__c = 'Sourcing Manager',
        Email = 'priya.nair@greenvalley.example', Phone = '+91 44 2800 3302', MobilePhone = '+91 98410 33302', WhatsApp_Number__c = '+91 98410 33302',
        Country = 'India', Country__c = 'India', LeadSource = 'Website', Status = stEngaged, Rating = 'Warm', Industry = 'Food & Beverage',
        Company_Type__c = 'Manufacturer', Customer_Type__c = 'Manufacturer', Potential_Category__c = 'Medium', Buying_Intent__c = 'Future Requirement', Purchase_Timeline__c = '3 Months',
        Estimated_Annual_Volume__c = 120, Expected_Monthly_Volume__c = 10, Lead_Classification__c = 'Potential Customer',
        Last_Contact_Date__c = today.addDays(-5), Next_Followup_Date__c = today.toStartOfWeek().addDays(4), Preferred_Communication__c = 'Email', Customer_Response__c = 'Waiting Approval',
        AI_Lead_Score__c = 61, Lead_Health__c = 'Medium', Description = MARK),
    new Lead(FirstName = 'Rakesh', LastName = 'Kumar', Company = 'Metro Retail Solutions', Title = 'Category Buyer', Designation__c = 'Category Buyer',
        Email = 'rakesh.kumar@metroretail.example', Phone = '+91 22 6600 4403', MobilePhone = '+91 98200 44403', WhatsApp_Number__c = '+91 98200 44403',
        Country = 'India', Country__c = 'India', LeadSource = 'Referral', Status = stQualified, Rating = 'Cold', Industry = 'Retail',
        Company_Type__c = 'Retailer', Customer_Type__c = 'Retailer', Potential_Category__c = 'Low', Buying_Intent__c = 'Information Gathering', Purchase_Timeline__c = 'Long Term',
        Estimated_Annual_Volume__c = 24, Expected_Monthly_Volume__c = 2, Lead_Classification__c = 'Potential Customer',
        Last_Contact_Date__c = today.addDays(-20), Next_Followup_Date__c = today.addDays(14), Preferred_Communication__c = 'Email', Customer_Response__c = 'Future Requirement',
        AI_Lead_Score__c = 25, Lead_Health__c = 'Low', Description = MARK)
};

Map<String, Lead> existing = new Map<String, Lead>();
for (Lead l : [SELECT Id, Company, LastName FROM Lead WHERE Company IN ('Healthy Earth Foods', 'Green Valley Organics', 'Metro Retail Solutions') AND IsConverted = false]) {
    existing.put(l.Company + '|' + l.LastName, l);
}
for (Lead l : wanted) {
    Lead old = existing.get(l.Company + '|' + l.LastName);
    if (old != null) { l.Id = old.Id; }
}
upsert wanted;

for (Lead l : [SELECT Name, Company, Rating, Rating_Indicator__c, Lead_Aging__c, Next_Followup_Date__c FROM Lead WHERE Id IN :wanted ORDER BY Rating]) {
    System.debug(l.Name + ' | ' + l.Company + ' | ' + l.Rating + ' | aging ' + l.Lead_Aging__c + ' | follow-up ' + l.Next_Followup_Date__c + ' | ' + l.Rating_Indicator__c);
}
System.debug('Lead rating demo leads loaded (Hot / Warm / Cold). Open Leads > Hot Leads / Warm Leads / Cold Leads / Action Today / This Week Closing.');
