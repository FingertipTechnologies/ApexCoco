#!/usr/bin/env python3
"""Generates report types, reports, dashboards and folders for the Apex Person 2 build."""
import os
from xml.sax.saxutils import escape as X
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FA = os.path.join(ROOT, 'force-app', 'main', 'default')
NS = 'http://soap.sforce.com/2006/04/metadata'
HDR = '<?xml version="1.0" encoding="UTF-8"?>\n'

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w').write(content)

# ------------------------------------------------------------------ folders
w(f'{FA}/reports/Apex_Sales_Reports.reportFolder-meta.xml', HDR + f'<ReportFolder xmlns="{NS}">\n    <folderShares>\n        <accessLevel>View</accessLevel>\n        <sharedTo>AllInternalUsers</sharedTo>\n        <sharedToType>Organization</sharedToType>\n    </folderShares>\n    <name>Apex Sales Reports</name>\n</ReportFolder>\n')
w(f'{FA}/dashboards/Apex_Sales_Dashboards.dashboardFolder-meta.xml', HDR + f'<DashboardFolder xmlns="{NS}">\n    <folderShares>\n        <accessLevel>View</accessLevel>\n        <sharedTo>AllInternalUsers</sharedTo>\n        <sharedToType>Organization</sharedToType>\n    </folderShares>\n    <name>Apex Sales Dashboards</name>\n</DashboardFolder>\n')

# ------------------------------------------------------------------ custom report types (Quote and Order have no reliable standard report type name)
def report_type(api, label, base, fields, section_label):
    cols = ''.join(f'        <columns>\n            <checkedByDefault>{"true" if i < 6 else "false"}</checkedByDefault>\n            <field>{f}</field>\n            <table>{base}</table>\n        </columns>\n' for i, f in enumerate(fields))
    w(f'{FA}/reportTypes/{api}.reportType-meta.xml', HDR + f'<ReportType xmlns="{NS}">\n    <baseObject>{base}</baseObject>\n    <category>other</category>\n    <deployed>true</deployed>\n    <description>Apex Person 2 demo report type.</description>\n    <label>{X(label)}</label>\n    <sections>\n{cols}        <masterLabel>{X(section_label)}</masterLabel>\n    </sections>\n</ReportType>\n')

report_type('Apex_Quotes', 'Apex Quotes', 'Quote',
            ['Name', 'QuoteNumber', 'Status', 'Quote_Version__c', 'TotalPrice', 'Discount', 'Approval_Status__c', 'Margin_Percent__c', 'Quote_Date__c', 'ExpirationDate', 'Revision_Reason__c', 'Competitor_Name__c', 'Competitor_Price__c', 'CreatedDate'],
            'Quotes')
report_type('Apex_Orders', 'Apex Orders', 'Order',
            ['OrderNumber', 'Status', 'EffectiveDate', 'PoNumber', 'PoDate', 'TotalAmount', 'SAP_Status__c', 'SAP_Order_Number__c', 'SAP_Invoice_Number__c', 'Integration_Mode__c', 'CreatedDate'],
            'Orders')

# ------------------------------------------------------------------ reports
def report(api, name, rtype, columns, group, filters=(), date_col=None, aggregates=(), desc='', sort=None, boolean_filter=None):
    x = HDR + f'<Report xmlns="{NS}">\n'
    for c in columns:
        if c in aggregates:
            x += f'    <columns>\n        <aggregateTypes>Sum</aggregateTypes>\n        <field>{c}</field>\n    </columns>\n'
        else:
            x += f'    <columns>\n        <field>{c}</field>\n    </columns>\n'
    x += f'    <description>{X(desc)}</description>\n'
    if filters:
        x += '    <filter>\n'
        if boolean_filter:
            x += f'        <booleanFilter>{X(boolean_filter)}</booleanFilter>\n'
        for col, op, val in filters:
            x += f'        <criteriaItems>\n            <column>{col}</column>\n            <columnToColumn>false</columnToColumn>\n            <isUnlocked>true</isUnlocked>\n            <operator>{op}</operator>\n            <value>{X(val)}</value>\n        </criteriaItems>\n'
        x += '    </filter>\n'
    x += '    <format>Summary</format>\n'
    x += f'    <groupingsDown>\n        <dateGranularity>Day</dateGranularity>\n        <field>{group}</field>\n        <sortOrder>Asc</sortOrder>\n    </groupingsDown>\n'
    x += f'    <name>{X(name)}</name>\n    <params>\n        <name>co</name>\n        <value>1</value>\n    </params>\n' if False else f'    <name>{X(name)}</name>\n'
    x += f'    <reportType>{rtype}</reportType>\n    <scope>organization</scope>\n    <showDetails>true</showDetails>\n    <showGrandTotal>true</showGrandTotal>\n    <showSubTotals>true</showSubTotals>\n'
    if date_col:
        x += f'    <timeFrameFilter>\n        <dateColumn>{date_col}</dateColumn>\n        <interval>INTERVAL_CUSTOM</interval>\n    </timeFrameFilter>\n'
    x += '</Report>\n'
    w(f'{FA}/reports/Apex_Sales_Reports/{api}.report-meta.xml', x)

SR = 'CustomEntity$Sample_Request__c'
report('Sample_Requests_by_Status', 'Sample Requests by Status', SR,
       ['CUST_NAME', 'Sample_Request__c.Account__c', 'Sample_Request__c.Product__c', 'Sample_Request__c.Iteration_Number__c', 'Sample_Request__c.Result__c', 'Sample_Request__c.Requested_Date__c', 'Sample_Request__c.Dispatch_Date__c', 'Sample_Request__c.Days_Since_Request__c'],
       'Sample_Request__c.Status__c', date_col='CUST_CREATED_DATE', desc='Sample lifecycle overview: requested, prepared, dispatched, testing, approved, rejected.')
report('Sample_Aging_Open', 'Sample Aging - Open Samples', SR,
       ['CUST_NAME', 'Sample_Request__c.Account__c', 'Sample_Request__c.Product__c', 'Sample_Request__c.Requested_Date__c', 'Sample_Request__c.Days_Since_Request__c', 'Sample_Request__c.Days_Pending_Feedback__c', 'Sample_Request__c.Next_Action__c'],
       'Sample_Request__c.Status__c', filters=[('Sample_Request__c.Status__c', 'notEqual', 'Approved,Rejected,Closed')], date_col='CUST_CREATED_DATE', desc='Open samples with days since request and days pending customer feedback.')
report('Sample_Rejections_by_Reason', 'Sample Rejections by Reason', SR,
       ['CUST_NAME', 'Sample_Request__c.Account__c', 'Sample_Request__c.Product__c', 'Sample_Request__c.Iteration_Number__c', 'Sample_Request__c.Customer_Feedback__c', 'Sample_Request__c.Next_Action__c'],
       'Sample_Request__c.Rejection_Reason__c', filters=[('Sample_Request__c.Result__c', 'equals', 'Rejected')], date_col='CUST_CREATED_DATE', desc='Why samples are rejected, to drive specification improvements.')
report('Opportunity_Pipeline_by_Stage', 'Opportunity Pipeline by Stage', 'Opportunity',
       ['OPPORTUNITY_NAME', 'ACCOUNT_NAME', 'Opportunity.Primary_Product__c', 'Opportunity.Expected_Annual_Volume__c', 'AMOUNT', 'CLOSE_DATE', 'FULL_NAME', 'Opportunity.Latest_Sample_Status__c', 'Opportunity.Next_Action__c'],
       'STAGE_NAME', filters=[('STAGE_NAME', 'notEqual', 'Closed Won,Closed Lost')], date_col='CLOSE_DATE', aggregates=('AMOUNT',), desc='Open pipeline value by Apex stage, with product, volume, owner and next action.')
report('Stale_Opportunities', 'Stale Opportunities (No Activity)', 'Opportunity',
       ['OPPORTUNITY_NAME', 'ACCOUNT_NAME', 'STAGE_NAME', 'Opportunity.Days_Since_Last_Activity__c', 'Opportunity.Next_Action__c', 'AMOUNT', 'CLOSE_DATE'],
       'FULL_NAME', filters=[('Opportunity.Days_Since_Last_Activity__c', 'greaterThan', '30'), ('STAGE_NAME', 'notEqual', 'Closed Won,Closed Lost')], date_col='CLOSE_DATE', aggregates=('AMOUNT',), desc='Open opportunities with no activity beyond the configured period, by owner.')
report('Won_Lost_Analysis', 'Won / Lost Analysis', 'Opportunity',
       ['OPPORTUNITY_NAME', 'ACCOUNT_NAME', 'Opportunity.Primary_Product__c', 'AMOUNT', 'CLOSE_DATE', 'Opportunity.Loss_Reason__c', 'Opportunity.Competitor__c', 'FULL_NAME'],
       'STAGE_NAME', filters=[('STAGE_NAME', 'equals', 'Closed Won,Closed Lost')], date_col='CLOSE_DATE', aggregates=('AMOUNT',), desc='Closed opportunities with loss reasons and competitor context for re-engagement.')
report('Quotes_and_Revisions', 'Quotes and Revisions', 'Apex_Quotes__c',
       ['Quote$Name', 'Quote$QuoteNumber', 'Quote$Quote_Version__c', 'Quote$TotalPrice', 'Quote$Discount', 'Quote$Margin_Percent__c', 'Quote$Approval_Status__c', 'Quote$Quote_Date__c', 'Quote$Revision_Reason__c'],
       'Quote$Status', date_col='Quote$CreatedDate', aggregates=('Quote$TotalPrice',), desc='Every quote version with discount, margin and approval status. Centralised pricing history instead of Excel.')
report('Competitor_Intelligence', 'Competitor Intelligence', 'CustomEntity$Competitor_Intel__c',
       ['CUST_NAME', 'Competitor_Intel__c.Account__c', 'Competitor_Intel__c.Opportunity__c', 'Competitor_Intel__c.Product__c', 'Competitor_Intel__c.Quoted_Price__c', 'Competitor_Intel__c.Customer_Preference__c', 'Competitor_Intel__c.Strength__c', 'Competitor_Intel__c.Weakness__c', 'Competitor_Intel__c.Intel_Date__c'],
       'Competitor_Intel__c.Competitor_Name__c', date_col='CUST_CREATED_DATE', desc='Who competes where, at what price, and what the customer prefers.')
report('Orders_and_SAP_Status', 'Orders and SAP Status (DEMO)', 'Apex_Orders__c',
       ['Order$OrderNumber', 'Order$Status', 'Order$EffectiveDate', 'Order$PoNumber', 'Order$TotalAmount', 'Order$SAP_Order_Number__c', 'Order$SAP_Invoice_Number__c', 'Order$Integration_Mode__c'],
       'Order$SAP_Status__c', date_col='Order$CreatedDate', aggregates=('Order$TotalAmount',), desc='Order visibility with the simulated SAP status. Integration is a labelled mock.')
report('Repeat_Business_Reorder_Status', 'Repeat Business - Reorder Status', 'AccountList',
       ['ACCOUNT.NAME', 'Account.Customer_Type__c', 'Account.Market__c', 'Account.Last_Purchase_Date__c', 'Account.Last_Order_Value__c', 'Account.Average_Reorder_Interval_Days__c', 'Account.Expected_Reorder_Date__c', 'Account.Orders_Last_12_Months__c'],
       'Account.Reorder_Status__c', date_col='Account.Last_Purchase_Date__c', desc='Customers due or overdue for a repeat order, with cadence and last purchase.')
report('Onboarding_Status', 'Customer Onboarding Status', 'CustomEntity$Customer_Onboarding__c',
       ['CUST_NAME', 'Customer_Onboarding__c.Account__c', 'Customer_Onboarding__c.Opportunity__c', 'Customer_Onboarding__c.Completion_Percent__c', 'Customer_Onboarding__c.Due_Date__c', 'Customer_Onboarding__c.Quality_Status__c', 'Customer_Onboarding__c.Finance_Status__c', 'Customer_Onboarding__c.Logistics_Status__c'],
       'Customer_Onboarding__c.Status__c', date_col='CUST_CREATED_DATE', desc='Pending and completed onboarding checklists.')

# ------------------------------------------------------------------ dashboards
def component(ctype, title, report_name, col, row, colspan=4, rowspan=4, sort='RowLabelAscending'):
    return (f'        <dashboardGridComponents>\n            <colSpan>{colspan}</colSpan>\n            <columnIndex>{col}</columnIndex>\n            <dashboardComponent>\n'
            f'                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>\n                <chartAxisRange>Auto</chartAxisRange>\n                <componentType>{ctype}</componentType>\n'
            f'                <displayUnits>Auto</displayUnits>\n                <drillEnabled>false</drillEnabled>\n                <drillToDetailEnabled>false</drillToDetailEnabled>\n                <enableHover>true</enableHover>\n'
            f'                <expandOthers>true</expandOthers>\n                <legendPosition>Bottom</legendPosition>\n                <report>Apex_Sales_Reports/{report_name}</report>\n'
            f'                <showPercentage>false</showPercentage>\n                <showTotal>true</showTotal>\n                <showValues>true</showValues>\n                <sortBy>{sort}</sortBy>\n'
            f'                <title>{X(title)}</title>\n                <useReportChart>false</useReportChart>\n            </dashboardComponent>\n            <rowIndex>{row}</rowIndex>\n            <rowSpan>{rowspan}</rowSpan>\n        </dashboardGridComponents>\n')

def dashboard(api, title, comps, desc):
    x = HDR + f'<Dashboard xmlns="{NS}">\n    <backgroundEndColor>#FFFFFF</backgroundEndColor>\n    <backgroundFadeDirection>Diagonal</backgroundFadeDirection>\n    <backgroundStartColor>#FFFFFF</backgroundStartColor>\n'
    x += '    <dashboardGridLayout>\n' + ''.join(comps) + '        <numberOfColumns>12</numberOfColumns>\n        <rowHeight>60</rowHeight>\n    </dashboardGridLayout>\n'
    x += f'    <dashboardType>LoggedInUser</dashboardType>\n    <description>{X(desc)}</description>\n    <isGridLayout>true</isGridLayout>\n    <textColor>#000000</textColor>\n    <title>{X(title)}</title>\n    <titleColor>#000000</titleColor>\n    <titleSize>12</titleSize>\n</Dashboard>\n'
    w(f'{FA}/dashboards/Apex_Sales_Dashboards/{api}.dashboard-meta.xml', x)

dashboard('Apex_Sales_Management', 'Apex Sales Management (Person 2)', [
    component('Bar', 'Pipeline by Apex Stage', 'Opportunity_Pipeline_by_Stage', 0, 0, colspan=6),
    component('Donut', 'Won / Lost', 'Won_Lost_Analysis', 6, 0, colspan=3),
    component('Donut', 'Customers - Reorder Status', 'Repeat_Business_Reorder_Status', 9, 0, colspan=3),
    component('Column', 'Quotes by Status', 'Quotes_and_Revisions', 0, 4, colspan=4),
    component('Bar', 'Stale Opportunities by Owner', 'Stale_Opportunities', 4, 4, colspan=4),
    component('Donut', 'Orders by SAP Status (DEMO)', 'Orders_and_SAP_Status', 8, 4, colspan=4),
], 'Management view of the Apex B2B lifecycle: pipeline by stage, win/loss, quotes, stale deals, repeat business and order status.')

dashboard('Apex_Sample_Management', 'Apex Sample Management (Person 2)', [
    component('Donut', 'Samples by Status', 'Sample_Requests_by_Status', 0, 0, colspan=4),
    component('Bar', 'Open Sample Aging by Status', 'Sample_Aging_Open', 4, 0, colspan=4),
    component('Donut', 'Rejections by Reason', 'Sample_Rejections_by_Reason', 8, 0, colspan=4),
    component('Bar', 'Competitor Intel', 'Competitor_Intelligence', 0, 4, colspan=6),
    component('Donut', 'Onboarding Status', 'Onboarding_Status', 6, 4, colspan=6),
], 'Sample lifecycle control: status mix, aging, rejection reasons, competitor intel and onboarding.')
print('reports written')
