Pre-built Metadata API package of the shared Lead contract (fields, Lead Status / Lead Source values, layout, record page,
Path, compact layout). Regenerate after changing shared-lead-contract/ with:

    sf project convert source --source-dir shared-lead-contract --output-dir manifest/lead-mdapi

Interested_Product__c is intentionally left out here because orgs that already hold it as a lookup cannot change its type.

Deploy:  sf project deploy start --metadata-dir manifest/lead-mdapi --ignore-errors --wait 20
