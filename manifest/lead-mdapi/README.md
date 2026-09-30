Pre-built Metadata API package of the shared Lead contract (fields, Lead Status / Lead Source values, layout, record page,
Path, compact layout). Regenerate after changing shared-lead-contract/ with ./scripts/build/build_lead_mdapi.sh.
Interested_Product__c is intentionally left out because orgs that already hold it as a lookup cannot change its type.
Deploy it BEFORE force-app when Lead fields were added (the permission sets in force-app reference them); the Lead layout's
related lists need the force-app objects, so on a brand-new org deploy force-app, then this package, then force-app again.
    sf project deploy start --metadata-dir manifest/lead-mdapi --ignore-errors --wait 20

The six Lead list views are packaged separately in manifest/lead-listviews-mdapi (deploy after this package and force-app):
    sf project deploy start --metadata-dir manifest/lead-listviews-mdapi --wait 20
