Pre-built Metadata API package of the shared Lead contract (fields, Lead Status / Lead Source values, layout, record page,
Path, compact layout). Regenerate after changing shared-lead-contract/ with the command in scripts/build/README.md.
Interested_Product__c is intentionally left out because orgs that already hold it as a lookup cannot change its type.
Deploy AFTER force-app (the Lead layout lists related objects that carry a Lead lookup):
    sf project deploy start --metadata-dir manifest/lead-mdapi --ignore-errors --wait 20
