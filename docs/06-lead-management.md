# 06 – Lead management: Rating Indicator, Lead Aging, Lead list views

Everything here is deployed metadata (no manual clicks in Setup). The Lead metadata lives in `shared-lead-contract/`
(and its Metadata API copy `manifest/lead-mdapi/`); the indicator images live in `force-app/`.

## What was reused (no duplicates)

| Requirement | Reused | Notes |
|---|---|---|
| Rating | standard `Lead.Rating` (Hot / Warm / Cold) | already on the Apex Lead layout |
| Follow-up date | existing `Lead.Next_Followup_Date__c` (Date, from the Person 1 spreadsheet) | drives *Action Today* and *This Week Closing* |
| Owner, Phone, Mobile, Email, Status, Company, Name | standard Lead fields | |
| Lead layout / record page / compact layout | `Lead-Apex Lead Layout`, `Apex_Lead_Record_Page`, `Apex_Lead_Compact` | extended, not replaced |

No expected-close-date field exists on Lead (Close Date lives on the Opportunity), so *This Week Closing* uses
`Next_Followup_Date__c = THIS_WEEK`. If Apex later wants a separate "Expected Closing Date" on Lead, add that field and
switch the filter; nothing else changes.

## New fields (Lead)

| Field | API name | Type | Formula |
|---|---|---|---|
| Rating Indicator | `Rating_Indicator__c` | Formula (Text) | `IF(ISPICKVAL(Rating, "Hot"), IMAGE("/resource/Apex_Rating_Indicators/red.png", "Hot", 16, 16), IF(ISPICKVAL(Rating, "Warm"), IMAGE("/resource/Apex_Rating_Indicators/amber.png", "Warm", 16, 16), IF(ISPICKVAL(Rating, "Cold"), IMAGE("/resource/Apex_Rating_Indicators/green.png", "Cold", 16, 16), "")))` |
| Lead Aging | `Lead_Aging__c` | Formula (Number, 0 decimals, blanks = 0) | `TODAY() - DATEVALUE(CreatedDate)` |

**Why a static resource instead of `/img/samples/color_red.gif`:** the legacy sample images still exist in most orgs but are
undocumented and can disappear; a static resource (`Apex_Rating_Indicators`, zip with `red.png`, `amber.png`, `green.png`)
is owned by the project, versioned with it, cached by the browser (`cacheControl = Public`) and renders in Lightning
list views, related lists, record detail, the highlights panel (compact layout) and reports. `IMAGE()` formulas are the
only declarative way to show an image in a list view column; Lightning renders them as an `<img>` with the alt text
(Hot / Warm / Cold) for screen readers. Limitations: the image is not sortable/filterable (sort on *Rating* instead), it
cannot be used in Path/Kanban colours, and a Text formula cannot be the list-view row highlight.

**Lead Aging:** `CreatedDate` is a Date/Time, so `DATEVALUE()` turns it into a Date in the user's time zone; subtracting two
Dates gives whole days. Created today = 0, 10 days ago = 10, 100 days ago = 100. It recalculates every time the record is
displayed or queried, so it never needs to be edited.

Where they appear: Lead layout (Rating Indicator right after Rating, Lead Aging after Next Follow-up Date, both read-only),
the highlights panel (compact layout, after Status), every Apex Lead list view, and field-level security on all four Apex
permission sets (read-only).

## List views (Lead)

All six share the same columns: **Name | Company | Rating Indicator | Rating | Phone | Mobile | Email | Lead Status | Lead Aging | Owner Alias**, scope *All leads*.

| List view (API name) | Filter |
|---|---|
| Apex Leads - All (Rating Indicator) (`Apex_All_Leads`) | none |
| Hot Leads (`Apex_Hot_Leads`) | Rating **equals** Hot |
| Warm Leads (`Apex_Warm_Leads`) | Rating **equals** Warm |
| Cold Leads (`Apex_Cold_Leads`) | Rating **equals** Cold |
| Action Today (`Apex_Action_Today`) | Next Follow-up Date **equals** TODAY |
| This Week Closing (`Apex_This_Week_Closing`) | Next Follow-up Date **equals** THIS WEEK |

Converted leads never appear in Lead list views, so no extra filter is needed. Users can still pin any of them as the
default and adjust columns with the list-view gear (Select Fields to Display).

## Deploy (existing org)

```powershell
git pull origin Gowtham
sf project deploy start --metadata-dir manifest/lead-mdapi --ignore-errors --wait 20        # Lead fields, layout, compact layout, list views
sf project deploy start --source-dir force-app --wait 60 --test-level RunSpecifiedTests --tests LeadSampleConversionServiceTest   # static resource + permission sets
sf apex run --file scripts/apex/loadLeadRatingDemo.apex                                    # 3 demo leads: Hot / Warm / Cold
sf project deploy start --metadata-dir manifest/lead-listviews-mdapi --wait 20             # the six Lead list views
sf apex run --file scripts/apex/verifyLeadManagement.apex                                  # automated check
```

Order matters: the Lead fields must exist before force-app, because the permission sets grant field-level security on them.
The only expected line in the first deploy's error list is `Interested_Product__c` (type differs in the org, ignored).

## Test checklist

1. **Indicators** – open *Leads › Apex Leads - All (Rating Indicator)*: Amit Joshi / Healthy Earth Foods shows a red circle
   with Rating Hot, Priya Nair / Green Valley Organics an amber circle with Warm, Rakesh Kumar / Metro Retail Solutions a
   green circle with Cold. ABC Foods International (golden lead) is Hot → red.
2. **Record page** – open any of them: the circle shows in the highlights panel next to Status and in the *Lead Information*
   section after Rating. Change Rating to Warm and save: the circle turns amber immediately.
3. **Lead Aging** – the demo leads show 0 today and 1 tomorrow. Any older lead in the org shows its real age.
4. **Hot / Warm / Cold Leads** – each view lists only leads with that rating; a lead with no rating appears in none of them.
5. **Action Today** – Amit Joshi (Next Follow-up Date = today) is listed; Rakesh Kumar (14 days ahead) is not.
6. **This Week Closing** – Amit Joshi and Priya Nair (follow-up this week) are listed; Rakesh Kumar is not.
7. **No regression** – *Request Sample* on the golden lead still converts it and creates the Sample Request; the Lead Path,
   related lists and all Person 2 flows are untouched (`verifyLeadManagement.apex` and `LeadSampleConversionServiceTest` pass).
