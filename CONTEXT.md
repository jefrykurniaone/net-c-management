# Sports Community Management

The single context of this repository: one community's activities, the sessions it runs, who takes part, and the money that pays for them.

## Language

### People

**User**:
A person with an account in this community. Signing in is open to anyone with a Google account; whether they are **in** the community is a separate property of the User, and says nothing about what they take part in. Two states sit behind that property and are never collapsed into one: **never admitted** (`admittedAt` is null) and **revoked** (`isActive` is false). A User in either state still signs in — they reach the waiting room, not the community.
_Avoid_: account, client, profile

**Applicant**:
A User who has signed in and completed their profile but has not been let into the community. An Applicant already holds Memberships, picked while completing their profile, and none of them mean anything until they are Admitted — so a count of Memberships is not a count of Members.
_Avoid_: pending member, pending user, candidate, requester, prospect, lead

**Member**:
A User who actively belongs to at least one Activity. The community-level sense of the word.
_Avoid_: subscriber, customer

**Participant**:
A Member in one named Activity. Never used bare — "a Badminton participant", never "a participant".
_Avoid_: player, attendee, joiner

**Membership**:
A Member's standing belonging to one Activity, carrying how they pay for it.
_Avoid_: subscription, enrolment, registration

**Member role**:
The lowest permission tier — may see and act on their own participation, money, and profile, and nothing else. A permission tier, never a synonym for Member.
_Avoid_: basic user, regular user

**Admin**:
The permission tier that runs the community: posts Sessions, confirms Payments, manages people and settings.
_Avoid_: moderator, staff, organiser

**Owner**:
An Admin whose own account cannot be altered by anyone, and whose contact details are hidden from other Admins. Carries no capability an Admin lacks.
_Avoid_: super admin, super user, root

**Admit** / **Decline**:
The Admin's act of letting an Applicant into the community, or refusing them. Deliberately **not** Confirm / Reject: those are the Admin's act on a Payment, and the two decisions must stay tellable apart in a column name, in a label, and in a sentence. "Approve" is banned here for the same reason it is banned there. Declining does not delete the record of who asked — the same Google account can always sign in again, so deletion was never a gate.
_Avoid_: approve, accept, authorise, grant, deny, reject, ban

### Activities and sessions

**Activity**:
Something the community does on a recurring basis, with its own price, weekly slot, capacity, and destination bank account.
_Avoid_: sport, class, program, club, ekskul

**Session**:
One occurrence of an Activity at a place and time — the thing members turn up to. The domain owns this word.
_Avoid_: event, match, meetup, fixture, training

**auth session**:
A signed-in browser's session. Deliberately lowercase and deliberately **not** a domain concept; it shares a word with Session only by accident of the authentication library. Never write "a Session" meaning this.

**Seat**:
One unit of a Session's capacity. Held by a Participant, released when they withdraw, and never held without money behind it.
_Avoid_: slot, spot, place, booking

### Money

**Dues**:
The recurring monthly amount a Participant owes for an Activity, however many Sessions they attend. Paying a month buys availability for that month, not a per-Session credit.
_Avoid_: subscription, monthly payment, membership fee

**Fee**:
The per-Session price a Participant owes for the single Session they join.
_Avoid_: cost, price, charge, ticket

**Amount Owed**:
The umbrella term for when the billing shape is not the point. Not a synonym for either Dues or Fee.

**Payment Mode**:
Which of the two a Participant is billed by for an Activity — Monthly or Per-Session. It belongs to their Membership, is resolved against a Billing Period, and is never inferred from what they have paid before.
_Avoid_: plan, tier, billing type

**Billing Period**:
One calendar month and year — the unit every obligation is resolved against. A Period that has arrived is settled, and is never rewritten.
_Avoid_: cycle, month, term

**Payment**:
A Participant's record of money sent, for Dues or for a Fee, carrying its Proof and whether an Admin has accepted it. Distinct from what is owed.
_Avoid_: transaction, receipt, invoice

**Proof**:
The image of a bank transfer a Participant uploads so an Admin can verify a Payment.
_Avoid_: receipt, attachment, evidence

**Confirm** / **Reject**:
The Admin's act of accepting or refusing a Payment after looking at its Proof. Never the act on a person — that pair is Admit / Decline.
_Avoid_: approve, validate, verify, admit, decline

### Attendance

**Registered**:
A Participant holds a Seat in a Session, with money behind it.
_Avoid_: booked, signed up, RSVP'd

**Present**:
A Participant attended a Session they held a Seat for.
_Avoid_: attended, checked in

**Opted Out**:
A Participant who held a Seat and withdrew, releasing it. The member's own choice, never a judgement about them — a Participant on Dues who opts out forfeits that Session rather than earning a credit.
_Avoid_: absent, no-show, cancelled, dropped out

**No-Show**:
A Participant who held a Seat, did not withdraw, and did not attend. It differs from Opted Out in exactly one way: nobody decided. Recorded only when an Admin says so, and never derived from a Session that ended with Seats still Registered — untaken attendance is an Admin's omission, not the member's.
_Avoid_: absent, missed, truant
