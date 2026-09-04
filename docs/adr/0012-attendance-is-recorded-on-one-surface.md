# Attendance is recorded on one surface, and the Session edit form only links to it

Recording who turned up used to live inside the Session edit form, which is where a Session's time, venue, capacity and fee are changed. Those are two different jobs at two different moments — the facts are set before the Session, the attendance after it — and two places that can record attendance is how they come to disagree. Attendance therefore has its own surface at `/admin/sessions/[id]/attendance`, and the edit form and its side cards carry a link to it and nothing else.

That surface saves the whole list as one write. The Admin's edits live in the client until Save, and only the rows they changed are sent, so a Session opened and saved without a touch is unchanged in the database, timestamps included. "Mark everyone Present" moves controls on this side of the wire and writes nothing on its own. `POST /api/sessions/[id]/attendance/bulk` validates the whole payload before writing anything — one bad row and nothing is written at all, which is the point of a transaction rather than a client fan-out that can half-save on a dropped connection — and drops rows whose value already matches what is stored, so a save that changes nothing touches no row. The single-row route stays where it is, for one-off corrections.

Nothing on either path derives a status. Untaken attendance stays Registered and a No-Show exists only where an Admin sent one; a Session whose attendance nobody took is an Admin's omission and says so at the top of the surface rather than being resolved into No-Shows overnight (`docs/adr/0001-no-show-attendance-value.md`, and the **No-Show** entry in `CONTEXT.md`).

Status: accepted, 2026-09-04.
