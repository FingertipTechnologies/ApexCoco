/**
 * Apex Coco - Person 2 DEMO DATA, part 1 of 4: products, price book, accounts, contacts
 * Anonymous Apex is limited to 32,000 characters, so the load runs as four scripts in order:
 *   sf apex run --file scripts/apex/loadDemoData_1_Master.apex
 *   sf apex run --file scripts/apex/loadDemoData_2_Pipeline.apex
 *   sf apex run --file scripts/apex/loadDemoData_3_Commercial.apex
 *   sf apex run --file scripts/apex/loadDemoData_4_Context.apex
 * All records are labelled APEX DEMO DATA; scripts/apex/resetDemoData.apex removes them.
 */
final String MARK = 'APEX DEMO DATA';
Date today = Date.today();
User me = [SELECT Id, Name FROM User WHERE Id = :UserInfo.getUserId()];
// ---- Products and standard price book (USD/MT, DEMO prices)
Pricebook2 standardPb = [SELECT Id, IsActive FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
if (!standardPb.IsActive) { standardPb.IsActive = true; update standardPb; }

Map<String, Decimal[]> productSpec = new Map<String, Decimal[]>{
    // name => {list price per MT, standard cost per MT}
    'Coconut Milk Powder'                 => new Decimal[]{ 3500, 2700 },
    'Coconut Cream Powder'                => new Decimal[]{ 3900, 3100 },
    'Coconut Cream'                       => new Decimal[]{ 2600, 2000 },
    'Desiccated Coconut - Fine'           => new Decimal[]{ 2400, 1900 },
    'Desiccated Coconut - Medium'         => new Decimal[]{ 2350, 1850 },
    'Low-Fat Desiccated Coconut'          => new Decimal[]{ 2600, 2100 },
    'Virgin Coconut Oil'                  => new Decimal[]{ 5200, 4200 },
    'Coconut Flour'                       => new Decimal[]{ 1900, 1500 },
    'Coconut Milk Powder - Private Label' => new Decimal[]{ 3650, 2850 }
};
Map<String, String> productFamily = new Map<String, String>{
    'Coconut Milk Powder' => 'Powders', 'Coconut Cream Powder' => 'Powders', 'Coconut Milk Powder - Private Label' => 'Powders',
    'Coconut Cream' => 'Liquids', 'Virgin Coconut Oil' => 'Oils', 'Coconut Flour' => 'Flour',
    'Desiccated Coconut - Fine' => 'Desiccated', 'Desiccated Coconut - Medium' => 'Desiccated', 'Low-Fat Desiccated Coconut' => 'Desiccated'
};
Map<String, Product2> products = new Map<String, Product2>();
for (Product2 p : [SELECT Id, Name FROM Product2 WHERE Name IN :productSpec.keySet()]) { products.put(p.Name, p); }
List<Product2> newProducts = new List<Product2>();
for (String name : productSpec.keySet()) {
    if (!products.containsKey(name)) {
        newProducts.add(new Product2(Name = name, ProductCode = name.replaceAll('[^A-Za-z]', '').left(10).toUpperCase(), IsActive = true,
            Family = productFamily.get(name), Description = MARK, Standard_Cost__c = productSpec.get(name)[1], Unit_of_Measure__c = 'MT'));
    }
}
insert newProducts;
for (Product2 p : newProducts) { products.put(p.Name, p); }
Map<Id, PricebookEntry> pbeByProduct = new Map<Id, PricebookEntry>();
for (PricebookEntry pbe : [SELECT Id, Product2Id, UnitPrice FROM PricebookEntry WHERE Pricebook2Id = :standardPb.Id AND Product2Id IN :products.values()]) { pbeByProduct.put(pbe.Product2Id, pbe); }
List<PricebookEntry> newPbes = new List<PricebookEntry>();
for (String name : productSpec.keySet()) {
    Product2 p = products.get(name);
    if (!pbeByProduct.containsKey(p.Id)) {
        newPbes.add(new PricebookEntry(Pricebook2Id = standardPb.Id, Product2Id = p.Id, UnitPrice = productSpec.get(name)[0], IsActive = true));
    }
}
insert newPbes;
for (PricebookEntry pbe : newPbes) { pbeByProduct.put(pbe.Product2Id, pbe); }
Product2 cmp = products.get('Coconut Milk Powder');
Product2 ccp = products.get('Coconut Cream Powder');
Product2 cream = products.get('Coconut Cream');
Product2 dcFine = products.get('Desiccated Coconut - Fine');
Product2 dcMed = products.get('Desiccated Coconut - Medium');
Product2 lfdc = products.get('Low-Fat Desiccated Coconut');
Product2 vco = products.get('Virgin Coconut Oil');
Product2 flour = products.get('Coconut Flour');
Product2 cmpPl = products.get('Coconut Milk Powder - Private Label');
// ---- Accounts and contacts
List<Account> accounts = new List<Account>{
    new Account(Name = 'ABC Foods International', Customer_Type__c = 'Importer', Business_Type__c = 'Food / ingredient importer', Market__c = 'Export', Industry = 'Food & Beverage', Website = 'www.abcfoods-intl.example', BillingCountry = 'United States', BillingState = 'New Jersey', BillingCity = 'Newark', Description = MARK),
    new Account(Name = 'Global Ingredients UK', Customer_Type__c = 'Importer', Business_Type__c = 'Ingredient distributor', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'United Kingdom', BillingCity = 'Manchester', Description = MARK),
    new Account(Name = 'Nature Brands India', Customer_Type__c = 'Brand', Business_Type__c = 'Consumer food brand', Market__c = 'India', Industry = 'Food & Beverage', BillingCountry = 'India', BillingCity = 'Bengaluru', Description = MARK),
    new Account(Name = 'Pacific Bakers Inc', Customer_Type__c = 'Direct Customer', Business_Type__c = 'Bakery manufacturer', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'United States', BillingCity = 'Los Angeles', Description = MARK),
    new Account(Name = 'Euro Dairy Alternatives GmbH', Customer_Type__c = 'Private Label', Business_Type__c = 'Plant-based dairy manufacturer', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'Germany', BillingCity = 'Hamburg', Description = MARK),
    new Account(Name = 'Gulf Trading LLC', Customer_Type__c = 'Distributor/Other', Business_Type__c = 'Food distributor', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'United Arab Emirates', BillingCity = 'Dubai', Description = MARK),
    new Account(Name = 'Aussie Health Foods Pty', Customer_Type__c = 'Brand', Business_Type__c = 'Health food brand', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'Australia', BillingCity = 'Melbourne', Description = MARK),
    new Account(Name = 'Nordic Foods AB', Customer_Type__c = 'Importer', Business_Type__c = 'Food importer', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'Sweden', BillingCity = 'Gothenburg', Description = MARK),
    new Account(Name = 'Mumbai Sweets Pvt Ltd', Customer_Type__c = 'Direct Customer', Business_Type__c = 'Confectionery manufacturer', Market__c = 'India', Industry = 'Food & Beverage', BillingCountry = 'India', BillingCity = 'Mumbai', Description = MARK),
    new Account(Name = 'Sunrise Beverages Ltd', Customer_Type__c = 'Private Label', Business_Type__c = 'Beverage co-packer', Market__c = 'Export', Industry = 'Food & Beverage', BillingCountry = 'United Kingdom', BillingCity = 'Leeds', Description = MARK)
};
insert accounts;
Map<String, Account> acc = new Map<String, Account>();
for (Account a : accounts) { acc.put(a.Name, a); }

List<Contact> contacts = new List<Contact>{
    new Contact(FirstName = 'Michael', LastName = 'Anderson', Title = 'VP Procurement', Email = 'michael.anderson@abcfoods-intl.example', Phone = '+1 973 555 0142', AccountId = acc.get('ABC Foods International').Id, Description = MARK),
    new Contact(FirstName = 'Laura', LastName = 'Chen', Title = 'R&D / QA Manager', Email = 'laura.chen@abcfoods-intl.example', Phone = '+1 973 555 0177', AccountId = acc.get('ABC Foods International').Id, Description = MARK),
    new Contact(FirstName = 'Sarah', LastName = 'Mitchell', Title = 'Logistics Coordinator', Email = 'sarah.mitchell@abcfoods-intl.example', AccountId = acc.get('ABC Foods International').Id, Description = MARK),
    new Contact(FirstName = 'Emma', LastName = 'Clarke', Title = 'Purchasing Director', Email = 'emma.clarke@globalingredients.example', AccountId = acc.get('Global Ingredients UK').Id, Description = MARK),
    new Contact(FirstName = 'James', LastName = 'Whitfield', Title = 'Quality Manager', Email = 'james.whitfield@globalingredients.example', AccountId = acc.get('Global Ingredients UK').Id, Description = MARK),
    new Contact(FirstName = 'Priya', LastName = 'Nair', Title = 'Head of Sourcing', Email = 'priya.nair@naturebrands.example', AccountId = acc.get('Nature Brands India').Id, Description = MARK),
    new Contact(FirstName = 'Daniel', LastName = 'Ortiz', Title = 'Plant Manager', Email = 'daniel.ortiz@pacificbakers.example', AccountId = acc.get('Pacific Bakers Inc').Id, Description = MARK),
    new Contact(FirstName = 'Katrin', LastName = 'Weber', Title = 'Head of Procurement', Email = 'katrin.weber@eurodairy.example', AccountId = acc.get('Euro Dairy Alternatives GmbH').Id, Description = MARK),
    new Contact(FirstName = 'Omar', LastName = 'Haddad', Title = 'General Manager', Email = 'omar.haddad@gulftrading.example', AccountId = acc.get('Gulf Trading LLC').Id, Description = MARK),
    new Contact(FirstName = 'Chloe', LastName = 'Bennett', Title = 'Product Manager', Email = 'chloe.bennett@aussiehealth.example', AccountId = acc.get('Aussie Health Foods Pty').Id, Description = MARK),
    new Contact(FirstName = 'Erik', LastName = 'Lindqvist', Title = 'Buyer', Email = 'erik.lindqvist@nordicfoods.example', AccountId = acc.get('Nordic Foods AB').Id, Description = MARK),
    new Contact(FirstName = 'Rohan', LastName = 'Desai', Title = 'Owner', Email = 'rohan.desai@mumbaisweets.example', AccountId = acc.get('Mumbai Sweets Pvt Ltd').Id, Description = MARK),
    new Contact(FirstName = 'Hannah', LastName = 'Price', Title = 'NPD Manager', Email = 'hannah.price@sunrisebev.example', AccountId = acc.get('Sunrise Beverages Ltd').Id, Description = MARK)
};
insert contacts;
Map<String, Contact> con = new Map<String, Contact>();
for (Contact c : contacts) { con.put(c.Email, c); }
Contact michael = con.get('michael.anderson@abcfoods-intl.example');
Contact laura = con.get('laura.chen@abcfoods-intl.example');
System.debug('Part 1 done: products=' + products.size() + ' accounts=' + accounts.size() + ' contacts=' + contacts.size());
