# UI Contract: Patient Profile Photos

Canonical visual authority: Figma section [`425:3`](https://www.figma.com/design/tnvp3CFNnb4aC6VWTkK2BI/Vytruve-Product-Design?node-id=425-3) in `Ready for Development`.

## Patient Identity

- Show one official shadcn Avatar before or beside the full patient name.
- Use the authenticated photo route only when `hasPhoto` is true.
- If the image is absent or fails, show initials derived from the first user-perceived character of each trimmed name.
- Keep the full name visible and programmatically available; the avatar is not a second navigation action.
- Preserve the existing table-row pointer, keyboard activation, age, date, pagination, scans, and printing behavior.

## Create Patient

- Preserve the existing responsive Dialog/Drawer, identity fields, submit action, and direct workspace navigation.
- Photo is optional. Empty state exposes one `Choose photo` action.
- Selection enters an announced preparing state and sends no request.
- Selected state shows the exact local crop, safe `format · size` summary, and official outline `Change` and `Remove` buttons.
- Invalid state shows one localized correction and `Choose photo`; submission with that file is unavailable.
- Cancel, close, replacement, and removal discard the exact local selection without clearing valid identity fields.

## Edit Patient

- The workspace identity card exposes one icon-only Edit patient button with a localized accessible name.
- Open the same field order and photo treatment in the approved desktop Dialog or compact Drawer.
- Existing photo state permits Change and Remove. No-photo state permits Choose photo.
- Save changes is unavailable when there is no effective change, a field or photo is invalid, or a mutation is pending.
- Successful save refreshes the workspace patient query and patient directory queries. The scan tab remains selected.
- Failed save keeps the previously confirmed patient visible and the edited form available for deliberate correction or retry.

## Local Photo States

| State | Announcement | Available actions |
| --- | --- | --- |
| Empty | Optional photo guidance | Choose photo |
| Preparing | Photo preparation in progress | Cancel flow; replacing or removing invalidates obsolete decode work |
| Selected | Safe format and size summary | Change, Remove, submit when fields are valid |
| Invalid | Localized type, size, or decode correction | Choose photo; no submit with the invalid file |
| Mutation pending | Existing localized pending feedback | No duplicate create/save, no destructive photo action |

## Accessibility And Localization

- Use the existing English and French resource files; no visible copy is inline.
- Use labels, roles, live regions, and native file input behavior before custom ARIA.
- Keep official button heights, focus rings, and icon sizes; never reproduce their geometry manually.
- Decorative photos use an empty alternative because the adjacent full name is the authoritative identity; the initials fallback remains visible text.
- Desktop and compact keyboard flows follow the existing Dialog/Drawer focus ownership.
