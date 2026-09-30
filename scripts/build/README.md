# Metadata generators

The repetitive metadata (objects, fields, validation rules, list views, compact layouts, layouts, Lightning pages,
permission sets, report types, reports, dashboards) is generated from declarative specs so API names stay consistent.
Hand-written metadata: flows, approval process, quick actions, Paths, app, tabs, Apex, settings, value sets.

```bash
python3 scripts/build/build_objects.py     # objects/fields/VRs/list views/compact layouts + field_inventory.json
python3 scripts/build/build_ui.py          # layouts + flexipages
python3 scripts/build/build_permsets.py    # permission sets (reads field_inventory.json)
python3 scripts/build/build_reports.py     # report types, reports, dashboards, folders
python3 scripts/build/check_refs.py        # cross-reference check (fields, flows, pages, actions)
sf project convert source --source-dir force-app --output-dir /tmp/mdapi   # structural validation
```
