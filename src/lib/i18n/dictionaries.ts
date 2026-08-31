import type { ChipLabelKey } from '@/lib/status-chip';

export type Locale = 'en' | 'id';

export const LOCALES: Locale[] = ['en', 'id'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

const en = {
    brand: {
        defaultCommunityName: 'XClub Community',
        // The public surfaces cannot fall back to the placeholder above: 08
        // bans every string containing "XClub" from `/`, and ticket 12 makes the
        // community name the public `<title>` and the OG card's whole
        // composition — so an unconfigured deployment would publish the
        // placeholder brand to a search result. This is the fallback the
        // unauthenticated routes use instead. No brand, nothing sport-specific,
        // and true of any community that has not filled its name in yet.
        unnamedCommunity: 'Our community',
        // The neutral root `<title>`, inherited by every route that sets none
        // of its own (ticket 12 decision 4). It replaced
        // `${communityName} - ${tagline}`, because root metadata runs on every
        // request to every route and may not read the database; behind auth a
        // tab label has a member for a reader, not a stranger. `/` overrides it
        // with the community name.
        defaultTitle: 'Community',
        // No reader as of ticket 12 decision 4, which dropped it from the root
        // layout's metadata — the one place it rendered. Whether the key itself
        // goes is 08's call, since 08 owns copy authority and scoped its ban to
        // `/`, so it stays standing here rather than being deleted in passing.
        tagline: 'XClub Community Management',
    },
    nav: {
        mainLabel: 'Main Menu',
        adminLabel: 'Admin',
        dashboard: 'Dashboard',
        sessions: 'Sessions',
        payments: 'Monthly Dues',
        profile: 'My Profile',
        signOut: 'Sign Out',
        adminDashboard: 'Dashboard',
        adminSessions: 'Sessions',
        adminPayments: 'Payments',
        // The admission queue's own nav item, directly above Members. Short
        // enough for the rail: the surface itself carries the long form.
        adminApplicants: 'Applicants',
        adminMembers: 'Members',
        adminActivity: 'Activities',
        adminSettings: 'Settings',
        sessionsShort: 'Sessions',
        paymentsShort: 'Payments',
        admin: 'Admin',
        memberView: 'Member view',
        navigationMenu: 'Navigation Menu',
        toggleTheme: 'Toggle theme',
        lightMode: 'Light Mode',
        darkMode: 'Themes',
    },
    /**
     * The public route's dictionary copy. It used to be the only namespace on
     * that route, on a decision that no `Settings` key may author the pitch;
     * `docs/spec-rally-public-v1.md` reopened exactly that and #153 carried it
     * out, so the block below is now the **fallback set**, not the whole of the
     * page's prose. An Admin who writes a headline in Settings replaces
     * `hero.pitch` for every visitor; one who writes nothing gets these
     * strings, which is why they still have to be good enough to ship alone.
     * The three objections that produced the old decision are answered rather
     * than dropped: the copy is capped (`src/lib/public-copy.ts`), the caps are
     * enforced at the form and again at the API, and the Display role's clamp
     * degrades a value that slips past both instead of painting over the
     * action. What still makes the page feel like *this* community without a
     * word of admin copy is data: the community name, the logo, and the board.
     *
     * One sub-block per band, mirroring the route's composition — hero, board,
     * footer — so a band added or cut is a block added or cut here. Only
     * `board` carries an empty string, because it is the only band that can be
     * empty. Voice: plain, second person, no superlatives, and no claims about
     * size, popularity or history. DESIGN.md's metaphor ban binds this route
     * too: no board, tile, rail or lattice in the copy.
     */
    landing: {
        hero: {
            // DESIGN.md, The Pitch Budget Rule — two independent limits, because
            // two different things break: <= 48 characters measured on the `id`
            // string (length drives line count, and therefore the fold), and no
            // word longer than 12 characters in either locale (longest word
            // drives horizontal overflow at both ends of the clamp). Both are
            // enforced by `src/lib/__tests__/pitch-budget.test.ts`. English is
            // authored second and lands shorter; that is slack, not a target.
            //
            // What a community *is* — turning up, a standing slot, the same
            // people — never what it plays: naming a sport is barred, so the
            // sport can only ever arrive through the board's real data.
            pitch: 'A game every week, and a place to play it.',
            lead: 'This community runs the same sessions every week. Pick the ones you want, turn up, and pay your share.',
            // A request, not an entry. Joining is approval-gated, so a label
            // promising membership would promise what this page cannot grant.
            cta: 'Ask to join this community',
            // DESIGN.md, Actions: a disclosure the label defers to is not fine
            // print. It renders at Body in secondary ink — never Caption, never
            // the subtle or muted step — and is tied to the button with
            // `aria-describedby`.
            //
            // The gate is disclosed *before* the click, never after. A stranger
            // who signs in with Google expecting access and lands in a waiting
            // room has been tricked into handing over an email address — and
            // "an organizer will let you in" is what an amateur community
            // actually is, so the honest version is also the friendlier one.
            disclosure:
                'Signing in with Google creates your account the first time you do it, and asks an organizer to let you in. They decide, and you get an email when they do.',
            alreadyMember: 'Already a member? Sign in',
        },
        board: {
            head: 'What you can play here',
            // Authored to survive the empty state: it describes what a row
            // holds rather than asserting that any exist, because this line
            // renders above the neutral-chipped strip on a community that has
            // just been set up.
            body: 'One activity, its weekly slot, where it happens, and when it next happens.',
            // The band never disappears — a community with nothing configured
            // renders one neutral-chipped strip carrying this line, never a
            // dropped band, because dropping it leaves a generic poster. The
            // chip's own label is `chips.unposted`, which already means
            // *expected but not yet placed* in both locales; a second wording
            // for it here would be two strings for one idea.
            empty: 'Nothing has been posted here yet.',
            // Prefix plus the shared weekday name from `days` below, so the
            // seven day names have one home in this file rather than two.
            weeklyPrefix: 'Every',
            nextLabel: 'Next',
            // Fees publish including zero, rendered as Free rather than Rp 0.
            free: 'Free',
            perMonth: '/ month',
            perSession: '/ session',
            // The quiet second action: Body weight, underlined, firing the
            // *same* action as the hero's pill. On a phone the page foot is
            // several screens from the pill, and a reader who has just been
            // convinced should not have to scroll back to act. Same action, so
            // the same promise — a request, not an entry.
            cta: 'Ask to join this community',
        },
        footer: 'Run by its members.',
        // A fourth sub-block, and not a band — 07's one-block-per-band rule
        // still holds for the three above it. This is what a stranger reads
        // *before* arriving: the search snippet and the link-preview image's
        // alt text. It lives here because metadata is resolved server-side per
        // request and reads this dictionary like any other copy (ticket 12, F4),
        // rather than becoming a third home for strings.
        //
        // A crawler sends no `NEXT_LOCALE` cookie, so a search snippet and a
        // WhatsApp preview are always the `en` strings (ticket 12, F2). The `id`
        // pair below is what a returning human with the cookie sees in their
        // browser tab. Consequence: 13's 48-character `id` budget is a
        // `type-hero` constraint and does **not** apply here — a snippet wants
        // ~155 characters and is read with no wordmark above it.
        meta: {
            // Its own string, not the hero's lead reused (ticket 12 decision 3):
            // the pitch is capped at 48 characters on `id`, 06 broke the
            // shared-copy coupling between `/` and `/auth/signin` deliberately,
            // and this is read in a search result by someone who has not seen
            // the page.
            //
            // Standing constraint: it may not name a schedule, sessions, or any
            // other inventory. The community may have nothing posted yet — 07
            // renders the board band neutral in that case — and a snippet
            // promising what is not there is `PRODUCT.md:94`'s evidence ban one
            // layer out. It describes the community and the act of joining, and
            // nothing else.
            description:
                'This is the page for one community and the way to ask to join it. Sign in with Google, and an organizer decides who comes in.',
            // The link-preview image's alt text. It describes the composition
            // rather than naming the community, because the OG image file's
            // `alt` export is static while the name is runtime configuration.
            // DESIGN.md:309's metaphor ban binds it: no board, tile, rail or
            // lattice, so the material is named by its colour.
            ogAlt: 'The community name, set large in white lettering on dark green.',
        },
    },
    /**
     * The Settings section where an Admin writes the public page's copy, and
     * the refusals that section answers with (#153).
     *
     * A block of its own rather than more keys inside `admin`, for one reason:
     * every string here is about the *public* page, and the block above is the
     * fallback set the same page falls back to. Keeping the two adjacent is
     * what makes "empty headline shows `landing.hero.pitch`" readable in one
     * screen instead of two.
     *
     * What is here is labels, help text and refusals — never the values. The
     * values are the Admin's own words, one per field, shown in both locales
     * by decision, and they never enter this file.
     */
    publicCopy: {
        sectionTitle: 'Public Page',
        heroHeadlineLabel: 'Headline',
        heroHeadlineHelper:
            'The first line a stranger reads. Leave it empty to use the default.',
        heroSublineLabel: 'Subline',
        heroSublineHelper:
            'One sentence under the headline. Leave it empty to use the default.',
        aboutLabel: 'About this community',
        aboutHelper:
            'A short paragraph in your own words. Line breaks are kept. Leave it empty to leave it out.',
        featureTitleLabel: 'Card {n} title',
        featureLineLabel: 'Card {n} line',
        featureHelper: 'A card with no title is not shown.',
        // Read by everyone, so the ratio is a fraction rather than a
        // subtraction: "40 left" hides the cap the refusal names.
        counter: '{count} / {max}',
        // Spoken before the fraction, so the counter is not two bare numbers to
        // a screen-reader user.
        counterLabel: 'Characters used',
        // Both name the cap, because a refusal that does not say the number
        // leaves the Admin deleting characters until it stops complaining. The
        // same two strings are used by the form and by the API.
        lengthCapRefusal: 'Too long — {max} characters at most.',
        wordCapRefusal: 'One word is too long — {max} letters at most.',
    },
    auth: {
        signInTitle: 'Sign In',
        signInSubtitle: 'Sessions, RSVPs and dues for your whole community — in one place.',
        signInButton: 'Continue with Google',
        // The other door, and it discloses the same gate `/` does — a member
        // signing back in is unaffected, and a stranger who found this page
        // first must not be told less than one who found the public route.
        signInNote:
            'Continuing with Google creates your account the first time you do it, and asks an organizer to let you in. By signing in you agree to the club rules.',
        errorTitle: 'Sign In Failed',
        errorMessage:
            'An error occurred during the login process. Please try again.',
        backToSignIn: 'Back to sign in page',
    },
    onboarding: {
        title: 'Complete Your Profile',
        subtitle: 'Complete your data before getting started.',
        welcome: 'Welcome to',
        welcomeSuffix: '!',
        name: 'Full Name',
        namePlaceholder: 'Enter your full name',
        phone: 'WhatsApp Number',
        phonePlaceholder: 'e.g. 628123456789',
        activityLabel: 'Choose Activities',
        activityHint: 'Select at least one activity to join.',
        submit: 'Save Profile',
        submitting: 'Saving...',
        // Rendered at the render site (src/app/onboarding), keyed off the
        // Zod issue code — the schema in src/lib/validations/user.ts stays
        // untouched and shared with the profile edit form. Each one names
        // both the problem and the fix, per DESIGN.md's Inputs error rule.
        nameErrorTooShort: 'Enter at least 2 characters for your name.',
        nameErrorTooLong: 'Shorten your name to 100 characters or fewer.',
        phoneErrorTooShort:
            'Enter a WhatsApp number with at least 9 digits, for example 628123456789.',
        phoneErrorTooLong: 'Enter a WhatsApp number with 15 digits or fewer.',
        phoneErrorInvalidChars:
            'Use digits only for your WhatsApp number — remove spaces, dashes, or letters.',
        activityErrorRequired: 'Select at least one activity to continue.',
    },
    /**
     * The Applicant's waiting room — its own top-level namespace, and the
     * dictionary authors all of it: `/pending` reads no `Settings` key beyond
     * the community name and the organizer's WhatsApp number, and no community
     * data at all.
     *
     * Three states on one route, each naming itself in its chip's own label:
     * **provisional** (held) for an Applicant waiting, **void** for one an
     * organizer declined, and void again for a member who was removed — the
     * labels tell those two apart. Each carries one statement and one lead
     * line; the page's only
     * affordances are messaging an organizer and signing out.
     */
    pending: {
        waitingMark: 'Waiting',
        waitingTitle: 'An organizer is reviewing your request',
        waitingLead:
            'You asked to join. Someone who runs this community has to let you in — usually within a day or two. We will email you the moment they do.',
        declinedMark: 'Declined',
        declinedTitle: 'You have not been let in',
        // WhatsApp is the recourse, and saying so is honest: the organizer
        // decided and the organizer can change their mind. There is no appeal
        // button and no re-apply flow.
        declinedLead:
            'An organizer reviewed your request and did not admit you. If you think that is a mistake, message them — they decide, and they can change their mind.',
        // The fourth admission state: admitted once, then revoked. It lands on
        // this route like an Applicant does, but "we did not admit you" would be
        // false for someone who was already in.
        revokedMark: 'Removed',
        revokedTitle: 'Your place in this community was removed',
        revokedLead:
            'An organizer took you off the register, so the community is no longer yours to see. Message them if you want to come back — they decide, and they can change their mind.',
        whatsapp: 'Message an organizer',
        signOut: 'Sign out',
    },
    dashboard: {
        welcomeGreeting: 'Welcome back,',
        duesTitle: 'Dues',
        duesNotPaid: 'Unpaid',
        uploadProof: 'Upload Proof',
        attendanceTitle: 'Attendance',
        sessions: 'sessions',
        attendanceRateTitle: 'Attendance Rate',
        thisMonth: 'this month',
        upcomingLabel: 'Upcoming',
        unpaid: 'unpaid',
        yourActivities: 'Your activities',
        viewAllShort: 'View all',
        payNow: 'Pay now',
        duesUnpaidBanner: 'dues unpaid',
        /**
         * The Activity card's neutral chip when nothing has been sent for the
         * period. Its own key rather than `duesUnpaidBanner`, which is prose the
         * dues banner reads as "{Activity} dues unpaid" and would become
         * "Badminton Pending" if the two shared one.
         */
        duesPendingMark: 'Pending',
        reservationsToPay: '{n} reservations awaiting payment',
        reservationsToPaySub: 'Pay before the hold expires or the seat is released.',
        toPay: '{n} to pay',
        paid: 'Paid',
        going: 'Going',
        rsvp: 'RSVP',
        upcomingTitle: 'Upcoming Training Sessions',
        noUpcoming: 'No upcoming sessions.',
        registered: 'Registered',
        full: 'Full',
        participants: 'participants',
        viewAll: 'View all sessions →',
        feePerPerson: '/person',
        /**
         * The queued Dues change, one sentence per Activity it concerns. Member
         * vocabulary: "Dues", a figure and a month — "rate" is the Admin's word
         * for the stored row and never appears here. `{month}` receives the month
         * and the year, because a change may be queued as far as twelve Periods
         * ahead and "from January" alone would not say which.
         */
        duesChangeNotice: '{activity} Dues change to {amount} from {month}',
    },
    /**
     * Shared chart infrastructure (#169). Every admin/member chart ticket
     * (#170-#172) appends its own title, caption and series labels at the
     * end of this block — never reorders or reformats what is already here.
     */
    insights: {
        emptyChip: 'Empty',
        emptyMessage: 'No data for this period yet.',
        valuesToggle: 'View chart values as text',
        valuesListLabel: 'Chart values',
    },
    sessions: {
        title: 'Sessions',
        subtitle: '',
        noSessions: 'No sessions scheduled.',
        noPast: 'No past sessions.',
        chipAll: 'All',
        tabUpcoming: 'Upcoming',
        tabPast: 'Past',
        groupThisWeek: 'This week',
        groupLater: 'Later',
        registered: 'Registered',
        going: 'Going',
        rsvp: 'RSVP',
        full: 'Full',
        participants: 'participants',
        feePerPerson: '/person',
        backToList: 'Back to session list',
        backTitle: 'Session',
        participantsLabel: 'Participants',
        playersLabel: 'Players',
        areYouPlaying: 'Are you playing?',
        showAllPlayers: 'Show all {n} players',
        mapLink: 'Map',
        perPlayer: ' per player',
        durationHour: 'hour',
        durationHours: 'hours',
        maybe: 'Maybe',
        cantMakeIt: "Can't make it",
        rsvpCloses: 'RSVP closes',
        rsvpClosed: 'RSVP closed',
        toastMaybeSuccess: 'Marked as maybe.',
        attendeeList: 'Attendee List',
        noAttendees: 'No registered participants yet.',
        notesLabel: 'Notes',
        register: 'Register',
        cancelRegistration: 'Cancel Registration',
        sessionFull: 'Session Full',
        sessionCompleted: 'Session Completed',
        sessionCancelled: 'Session Cancelled',
        registering: 'Registering...',
        cancelling: 'Cancelling...',
        toastRegisterSuccess: 'Successfully registered!',
        toastCancelSuccess: 'Registration cancelled.',
        toastModeSwitched: 'Payment mode updated.',
        toastModeQueued: '{mode} takes effect from {period} — the current period is already paid, so its price is unchanged.',
        modeSwitchPending: 'Switching to {mode} from {period}',
        toastRegisterError: 'Failed to register',
        toastCancelError: 'Failed to cancel registration',
        registerAndPay: 'Register & pay',
        payRequired: 'Payment required — register & pay for this session.',
        notFound: 'Session not found.',
        notRegisterable: 'This session is not open for registration.',
        registeredPending: 'Registered · awaiting confirmation',
        registeredPaid: 'Registered · paid',
        quotaLabel: 'cost-sharing quota',
        quotaMet: 'Quota met',
        quotaNeedMore: 'Needs {n} more',
        contactAdmin: 'Contact Admin (WhatsApp)',
        joinDialogTitle: 'Choose how you pay',
        joinDialogDesc:
            'Joining this session also joins its activity. Pick a payment option:',
        joinMonthlyDesc:
            'Pay monthly dues once — auto-registered for every session this month',
        joinPerSessionDesc: 'Pay only for the sessions you join',
        payMonthlyFirst: 'Pay monthly dues first',
        paymentRejected: 'Payment rejected · upload again',
        changePaymentMode: 'Change payment mode',
        cancelBlockedConfirmed:
            "A confirmed payment can't be self-cancelled — contact an admin.",
        viewMine: 'My activities',
        viewAll: 'All activities',
        noJoinedActivities:
            "You haven't joined any activities yet — switch to All to explore.",
        chooseModeFirst: 'Choose a payment option first.',
        reservedPayWithin: 'Reserved · pay within {time}',
        holdExpired: 'Reservation expired',
        payNow: 'Pay now',
        // The one string the public session page still renders. Its two former
        // neighbours — `publicPageSpots` and `publicPageFull` — went with the
        // capacity figures themselves: ticket 12 decision 1 bars every
        // capacity-derived number from an unauthenticated route, because the
        // figure cannot be made true there (the holds sweep that would correct
        // it deletes rows and queues mail, which no public GET may do).
        publicPageRsvpCta: 'Sign in to RSVP',
        shareSession: 'Share session',
        shareSessionDesc: 'Invite friends to join this session',
        shareViaWhatsapp: 'Share via WhatsApp',
        shareViaTwitter: 'Share on X',
        copyLink: 'Copy link',
        linkCopied: 'Copied!',
        // The sessions board. The day label *inside* a cell is the short form:
        // the full name is the column head, and the cell's own label has to
        // clear the column floor the fixed positions were measured against.
        // Sunday-first, so it indexes `BoardDay.weekday` directly.
        boardDaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        boardLabel: 'Sessions by day',
        boardWeekNavLabel: 'Change week',
        boardPrevWeek: 'Previous week',
        boardThisWeek: 'This week',
        boardNextWeek: 'Next week',
        boardWeekOf: '{start} – {end}',
        // A day nobody planned anything on, as opposed to one an Admin still
        // owes a Session. Both draw a neutral chip; only the second is late.
        boardNothingMark: 'None',
        boardNothingOnDay: 'Nothing on this day.',
        boardNotPosted: 'An Admin has not posted this session yet.',
        boardNeverPosted:
            'Sessions have not been posted yet. They appear here as soon as an Admin posts one.',
        boardSeatsFree: 'Free',
        boardSeatsAria: '{n} of {max} seats free',
        // Claiming and releasing a Seat from the row the member is reading.
        // Every control on the surface reads the same two words, so each one
        // names its own Session to a screen reader.
        boardClaim: 'Claim a Seat',
        boardClaimAndPay: 'Claim & pay',
        boardClaimAria: 'Claim a Seat in {title}',
        boardWithdraw: 'Withdraw',
        boardWithdrawAria: 'Withdraw from {title}',
        boardClaimed: 'Seat claimed.',
        boardWithdrawn: 'Seat released — somebody else can take it now.',
        // Dues buy availability for the month, not this Session, so releasing a
        // Seat forfeits it. Said plainly, so nobody waits for money back.
        boardForfeited:
            'Seat released. Your Dues cover the month, not this Session, so nothing is refunded.',
        boardChooseMode: 'Choose how you pay for this activity first.',
        boardOptedOut: 'You released this Seat.',
        duesForfeited:
            'You opted out of this Session. Your Dues cover the month, not this Session, so nothing is refunded.',
        // The week strip. The footer figure is spelled out rather than left as
        // `n/max`: a card has the room a fixed cell did not, and "free of" is
        // what stops the pair being read as taken-of-total.
        weekSeatsFigure: '{n} free of {max}',
        // A Seat claimed against money nobody has confirmed yet. "Reserved" is
        // the word the Session page already uses for this state; the deadline
        // beside it is the fact that can cost the member the Seat.
        weekSeatHeld: 'Reserved',
        weekHoldPayBy: 'Pay by {time}',
        // A card's whole accessible name, so one card announces the day, the
        // time, the Activity and its status without the reader tabbing through
        // four fragments. The chip's own label is in the footer beside it.
        weekCardAria: '{day}, {time}, {activity}: {title}, {venue}. {status}',
    },
    payments: {
        title: 'Monthly Dues',
        subtitle: 'Your payment history',
        uploadBtn: 'Upload Proof',
        unpaidBannerTitle: 'dues not yet paid',
        unpaidBannerSub: 'Please upload your payment proof.',
        payNow: 'Pay now',
        unpaidDuesTitle: '{count} unpaid dues for {month}',
        perMonth: '/month',
        paid: 'Paid',
        /** Neutral chip: Dues owed with nothing sent yet. Cf. `inReview`. */
        unpaid: 'Pending',
        historyLabel: 'History',
        submitted: 'Submitted',
        historyStatus: {
            PENDING: 'In review',
            CONFIRMED: 'Approved',
            REJECTED: 'Rejected',
        },
        noPayments: 'No payment history.',
        uploadProofBtn: 'Upload Payment Proof',
        viewProof: 'View Proof',
        rejectReason: 'Rejection reason',
        rejectedRefundWarning:
            'If you already transferred the money, contact the admin on WhatsApp for a refund.',
        confirmedAt: 'Confirmed:',
        rejectedNote: 'Rejection note:',
        backToHistory: 'Back to dues history',
        uploadTitle: 'Upload Payment Proof',
        amountLabel: 'Amount',
        periodLabel: 'Period',
        verifyNote: 'The admin will verify your payment within 24 hours.',
        submitReview: 'Submit for review',
        uploadReceipt: 'Tap to upload transfer receipt',
        fileLabel: 'Payment Proof (Image)',
        fileDesc: 'JPG, PNG, WebP · Max 5MB',
        noFileSelected: 'No file selected',
        submit: 'Submit Payment',
        submitting: 'Uploading...',
        selectFile: 'Please select a payment proof file first',
        toastSuccess: 'Payment proof uploaded! Awaiting admin confirmation.',
        toastError: 'Failed to upload proof',
        selectImage: 'Click to select image',
        amountLocked: "Set by this activity's Dues for the month",
        sessionAmountLocked: "Set by this session's fee",
        inReview: 'In review',
        transferTo: 'Transfer to',
        noBankInfo:
            'No bank account is configured for this activity — contact the admin for payment details.',
        owedFor: 'Monthly dues for {activity} · {month} {year}',
        notMonthlyMode: "You're not on monthly billing for this activity this period.",
        noMonthlyFee: 'This activity has no Dues set for this month.',
        noMonthlyActivity: 'You have no activities billed monthly.',
        notPerSessionMode: "You're not on per-session billing for this session.",
        noSessionFee: 'This session has no fee set.',
        sessionOwedFor: 'Session fee for {activity} · {session}',
        paySessionTitle: 'Register & pay',
        rejectReasonPrompt: 'Enter a reason for rejecting this payment',
        alreadyConfirmed: 'This payment has already been confirmed.',
        outstandingReservations: 'Reserved · pay now',
        payWithin: 'Pay within {time}',
        // When no activity resolves to monthly billing for this period, the
        // uploader names which cause applies and where it is resolved. Two
        // causes used to render as the same empty select; a third (no activity
        // at all) and a fourth (an activity offering no payment mode) are
        // distinct situations that must not be folded into either.
        modeUnchosenTitle: 'You have not chosen how you pay yet',
        modeUnchosenBody:
            'You have not chosen how you pay for {activities}, so no monthly dues have been raised for {period}. You pick monthly or per session when you claim a seat in a session.',
        modeUnchosenAction: 'Choose how you pay',
        perSessionOnlyTitle: 'Nothing monthly to pay here',
        perSessionOnlyBody:
            'You are billed per session for {activities}, so there are no monthly dues for {period}. A session fee is paid from the session itself, when you claim a seat.',
        perSessionOnlyAction: 'Go to sessions',
        noActivityTitle: 'You have not joined an activity yet',
        noActivityBody:
            'Monthly dues belong to an activity and you have not joined one, so there is nothing to pay for {period}. Claiming a seat in a session joins its activity.',
        noActivityAction: 'Browse sessions',
        noBillingTitle: 'No payment mode is set up yet',
        noBillingBody:
            'No payment mode is configured for {activities}, so nothing can be billed for {period}. Ask an admin to set the payment options.',
        periodLocked: 'The current period, set by the calendar',
        activityNotChosen:
            'No activity chosen. Pick the activity these monthly dues are for, then submit again.',
        proofMissing:
            'No proof attached. Choose a photo or screenshot of your transfer, then submit again.',
        proofFileFix:
            'Attach a photo or screenshot of the transfer — JPG, PNG, or WebP, up to 5MB.',
        // Payments history (#58): every amount says which of the two it
        // settles, matching the wording profile settled for the same pair
        // (#56) so the two surfaces agree.
        duesLabel: 'Dues',
        feeLabel: 'Fee',
    },
    profile: {
        title: 'Profile',
        subtitle: 'Manage your account information',
        editTitle: 'Edit Information',
        editButton: 'Edit',
        name: 'Full Name',
        namePlaceholder: 'Your name',
        phone: 'WhatsApp Number',
        phonePlaceholder: 'e.g. 628123456789',
        save: 'Save Changes',
        saving: 'Saving...',
        changePhotoAlt: 'Change profile photo',
        memberSince: 'Member since',
        membershipsLabel: 'Memberships',
        noMemberships: 'No activities yet',
        joinedPrefix: 'Joined',
        accountLabel: 'Account',
        phoneRow: 'Phone number',
        phoneNotSet: 'Not set',
        language: 'Language',
        theme: 'Theme',
        themeLight: 'Light',
        themeDark: 'Dark',
        roleAdmin: 'Admin',
        roleMember: 'Member',
        toastSuccess: 'Profile updated successfully!',
        toastPhotoSuccess: 'Profile photo updated!',
        toastPhotoError: 'Failed to upload photo',
        leaveButton: 'Leave',
        leaveTitle: 'Leave {name}?',
        leaveBody:
            "You'll be removed from this activity. Upcoming reserved sessions you haven't paid for will be released. Sessions you've already paid for and had confirmed stay booked. Paid dues are not refunded.",
        leaveConfirm: 'Leave activity',
        leaveToast: 'You left {name}',
        // Per-Activity payment mode, and when a change to it takes effect.
        // Payment mode belongs to a Membership, not to the person, so the copy
        // names the Activity every time. `markNotPaid` labels the neutral chip
        // for a Billing Period nothing has been paid against yet — it lives here
        // rather than in `chips` because it labels a thing with no stored state.
        membershipsHint:
            'You pay for each activity on its own. Changing one leaves the others as they are.',
        modeLegend: 'How you pay for {name}',
        modeDuesLabel: 'Dues',
        modeFeeLabel: 'Fee',
        modeNoneChosen: 'Not chosen yet',
        modeSingleOffered: 'This activity offers one way to pay.',
        modeSaveButton: 'Save payment mode',
        currentPeriodRowLabel: 'This Billing Period',
        markNotPaid: 'Pending',
        modeEffectNow: 'Takes effect now, for the {period} Billing Period.',
        modeEffectNext:
            'Takes effect in the {next} Billing Period. {current} is already paid and does not change.',
        modeEffectUnchanged:
            'Already how you pay for the {period} Billing Period.',
        modeEffectCancels:
            'Cancels the change queued for {next}. You stay on this from {current} onward.',
    },
    admin: {
        dashboardTitle: 'Admin Dashboard',
        dashboardSubtitle: 'Activity summary for',
        totalMembers: 'Total Members',
        activeMembers: 'Active Members',
        upcomingSessions: 'Upcoming Sessions',
        pendingPayments: 'Pending Payments',
        confirmedThisMonth: 'Confirmed (this month)',
        inactive: 'inactive',
        needsConfirmation: 'needs confirmation',
        perActivityTitle: 'Activity Breakdown',
        upcomingShort: 'Upcoming',
        pendingShort: 'Pending',
        greetingMorning: 'Good morning',
        greetingAfternoon: 'Good afternoon',
        greetingEvening: 'Good evening',
        dashboardHeaderSub: "Here's how the club is doing",
        statActiveMembers: 'Active members',
        statSessionsThisWeek: 'Sessions this week',
        statCollected: 'Collected',
        newThisMonth: '+{n} this month',
        acrossActivities: 'across {n} activities',
        ofDue: 'of {amount} due',
        needReview: 'need review',
        needsAttentionTitle: 'Needs attention',
        itemsCount: '{n} items',
        allClear: 'All clear — nothing needs your attention right now.',
        pendingProofsItem: '{n} payment proofs waiting for review',
        pendingProofsSub: 'Review and confirm to keep dues on track',
        underBookedItem: '{title} is under-booked — {n} of {max}',
        rsvpClosesInDays: 'RSVP closes in {n} days',
        remindMembers: 'Remind members',
        remindSectionTitle: 'Remind members',
        remindSectionDesc: "Send email reminders to active members who haven't joined this session.",
        remindCooldown: 'Reminder sent {n}h ago · available again in {remaining}h',
        remindConfirmTitle: 'Send reminder emails?',
        remindConfirmDesc:
            "An email will be sent to all active members who haven't joined this session yet.",
        remindSendBtn: 'Send reminders',
        remindSending: 'Sending...',
        remindSuccessToast: 'Reminder sent to {n} member(s).',
        remindSkippedToast: '{n} member(s) skipped (no email on record).',
        remindErrorToast: 'Failed to send reminders. Please try again.',
        shareSession: 'Share session',
        shareSessionDesc: 'Share this link to invite new members',
        copyLink: 'Copy link',
        linkCopied: 'Copied!',
        shareViaWhatsapp: 'Share via WhatsApp',
        shareViaTwitter: 'Share on X',
        reviewAction: 'Review',
        thisWeekTitle: 'This week',
        allSessionsLink: 'All sessions',
        noSessionsThisWeek: 'No sessions scheduled this week.',
        attendanceMetric: 'attendance',
        sessionsPerWeek: 'sessions / wk',
        duesCollectedLabel: 'Dues collected',
        membersSuffix: 'members',
        sessionsTitle: 'Manage Sessions',
        sessionsSubtitle: 'Create and manage training sessions',
        newSession: 'New Session',
        colSession: 'Session',
        colDate: 'Date',
        colLocation: 'Location',
        colStatus: 'Status',
        colActions: 'Actions',
        detail: 'Detail',
        edit: 'Edit',
        noSessions: 'No sessions yet.',
        noSessionsMatch: 'No sessions match your search.',
        // The admission queue. Its own surface rather than a band on the roster:
        // this is where new people are let into the community, and it should not
        // be something you find by scrolling past a register. Empty on most
        // days, so the empty state is part of the design.
        applicantsTitle: 'Asking to join',
        applicantsSubtitle: '{n} waiting for a decision',
        applicantsHint: 'They cannot see anything until you let them in',
        applicantsEmpty: 'Nobody is waiting.',
        applicantsEmptyMark: 'Empty',
        applicantsToRoster: 'Back to the member list',
        applicantPhone: 'WhatsApp',
        applicantWants: 'Asked to join',
        applicantWaited: 'Waited',
        waitedToday: 'today',
        waitedDays: '{n}d',
        admit: 'Admit',
        decline: 'Decline',
        admitConfirmTitle: 'Admit {name}?',
        admitConfirmDesc:
            'They get into the community straight away, and an email telling them so.',
        declineConfirmTitle: 'Decline {name}?',
        declineConfirmDesc:
            'They stay signed in but see only a page saying an organizer did not admit them, and they drop out of this queue. No email is sent.',
        admittedToast: '{name} is in.',
        declinedToast: '{name} was declined.',
        membersTitle: 'Manage Members',
        searchPlaceholder: 'Search name or email...',
        searchBtn: 'Search',
        colName: 'Name',
        colRole: 'Role',
        active: 'Active',
        inactive2: 'Inactive',
        profileIncomplete: 'Profile Incomplete',
        colPhone: 'Phone',
        noMembers: 'No members found.',
        memberDetailBack: 'Back to member list',
        memberNameEmpty: '(Not set)',
        memberJoined: 'Joined',
        attendanceHistory: 'Attendance History',
        noAttendanceData: 'No attendance data yet.',
        duesHistory: 'Dues History',
        noDuesData: 'No dues data yet.',
        paymentsTitle: 'Manage Dues',
        paymentsSubtitle: 'Confirm or reject payment proofs',
        allMonths: 'All Months',
        allStatuses: 'All Statuses',
        allYears: 'All Years',
        filterBtn: 'Filter',
        exportCSV: 'Export CSV',
        csvHeaders: {
            no: 'No',
            name: 'Name',
            email: 'Email',
            whatsapp: 'WhatsApp',
            status: 'Status',
            registeredAt: 'Registered At',
            activity: 'Activity',
            month: 'Month',
            year: 'Year',
            amount: 'Amount (Rp)',
            uploadedAt: 'Uploaded At',
            confirmedAt: 'Confirmed At',
        },
        settingsTitle: 'Community Settings',
        settingsSubtitle: 'Default configuration for',
        communityNameLabel: 'Community Name',
        defaultLocationLabel: 'Default Location / Hall',
        defaultLocationPlaceholder: 'e.g. Community Sports Hall',
        adminWhatsappLabel: 'Admin WhatsApp Number',
        whatsappHint: 'Country code without + (e.g. 628...)',
        holdDurationLabel: 'Payment hold duration',
        holdDurationHint:
            'How long a reserved seat waits for payment before it is released.',
        holdDuration60: '1 hour',
        holdDuration30: '30 minutes',
        holdDuration15: '15 minutes',
        holdDurationCustom: 'Custom',
        holdDurationCustomLabel: 'Custom duration (minutes)',
        logoLabel: 'Community Logo',
        logoHint: 'JPG, PNG, WebP · Max 2MB',
        logoUpload: 'Upload Logo',
        logoChange: 'Change Logo',
        logoUploading: 'Uploading...',
        logoSuccess: 'Logo updated successfully!',
        logoFail: 'Failed to upload logo',
        saveSettings: 'Save Settings',
        saving: 'Saving...',
        newSessionTitle: 'Create New Session',
        backToSessions: 'Back to session list',
        formTitle: 'Session Title',
        formDate: 'Date',
        formStartTime: 'Start Time',
        formEndTime: 'End Time',
        formLocation: 'Location',
        formMaxPlayers: 'Max Participants',
        formFee: 'Session Fee (Rp)',
        formNotes: 'Notes (Optional)',
        createBtn: 'Create Session',
        creating: 'Creating...',
        editSessionTitle: 'Edit Session',
        updateBtn: 'Update Session',
        updating: 'Updating...',
        deleteBtn: 'Delete Session',
        confirmDelete:
            'Are you sure you want to delete this session? All attendance data will also be deleted.',
        markAllPresent: 'Mark All Present',
        attendanceUpdated: 'Attendance status updated',
        attendanceUpdateFailed: 'Failed to update attendance',
        sessionUpdated: 'Session updated!',
        sessionDeleted: 'Session deleted',
        sessionUpdateFailed: 'Failed to save',
        sessionDeleteFailed: 'Failed to delete session',
        sessionCreated: 'Session created!',
        sessionCreateFailed: 'Failed to create session',
        activityLocked: 'Activity cannot be changed after the session is created.',
        // Reworded with the locking rules (#69): a Payment freezes the fee even
        // where no Seat is held, and a released hold unfreezes it, so
        // "once members have registered" no longer states the rule.
        feeLocked:
            'This fee cannot be changed: this session already has a payment or a held seat.',
        sessionCreateHint: 'Activity and fee have restrictions after creation — see below.',
        memberUpdated: 'Successfully updated',
        memberUpdateFailed: 'Failed to update',
        paymentConfirmed: 'Payment confirmed',
        paymentRejected: 'Payment rejected',
        paymentUpdateFailed: 'Failed to update payment status',
        paymentAlreadyReviewed: 'This payment has already been reviewed.',
        confirmReject: 'Are you sure you want to reject this payment?',
        deactivateMember: 'Deactivate',
        activateMember: 'Activate',
        deactivateConfirmTitle: 'Deactivate {name}?',
        deactivateConfirmDesc:
            'They lose access to all activities and upcoming RSVPs. Payment history is kept.',
        typeToConfirmPrompt: 'Type {word} to confirm',
        typeToConfirmWord: 'deactivate',
        makeAdmin: 'Make Admin',
        makeMember: 'Make Member',
        roleChangeConfirmTitle: 'Change role for {name}?',
        roleChangeConfirmDesc:
            'Admins can manage sessions, payments, members and settings.',
        settingsSaved: 'Settings saved!',
        settingsFailed: 'Failed to save settings',
        proof: 'Proof',
        confirmBtn: 'Confirm',
        rejectBtn: 'Reject',
        colMember: 'Member',
        colAmount: 'Amount',
        noPayments: 'No payments found.',
        activityTitle: 'Manage Activities',
        activitySubtitle: 'Create and manage activities',
        activityRegistered: 'activities',
        newActivity: 'New Activity',
        editActivity: 'Edit Activity',
        activityName: 'Name',
        activityNamePlaceholder: 'e.g. Yoga, Futsal, Running',
        activitySlug: 'Slug',
        activitySlugHint: 'URL-friendly id, e.g. "yoga-club"',
        activitySlugPlaceholder: 'yoga-club',
        activityDescription: 'Description (Optional)',
        activityFee: 'Dues Rate (Rp)',
        activitySessionFee: 'Session Fee (Rp)',
        activityPaymentModes: 'Payment Modes',
        activityModeMonthly: 'Monthly',
        activityModePerSession: 'Per-Session',
        activityLocation: 'Default Location',
        activityMaxPlayers: 'Default Max Participants',
        activityWhatsapp: 'Admin WhatsApp',
        activityBankName: 'Bank',
        activityBankNamePlaceholder: 'e.g. BCA',
        activityBankNumber: 'Account Number',
        activityBankHolder: 'Account Holder',
        activityBankHint:
            'Members see this account (with a copy button) when uploading a payment. Leave empty to hide it.',
        sectionBasicInfo: 'Basic Info',
        sectionPayment: 'Payment & Fees',
        sectionSchedule: 'Sessions & Schedule',
        sectionContact: 'Admin Contact',
        sectionScheduleLocation: 'Schedule & Location',
        sectionParticipantsFee: 'Participants & Fee',
        activityMinMembers: 'Minimum members',
        activityMinMembersHint:
            'Paying members needed per session to cover shared costs, e.g. venue rent (0 = no minimum)',
        activityRecurringTitle: 'Weekly session auto-schedule',
        activityRecurringHint:
            "This month's weekly sessions are created automatically on the chosen day (Monthly mode).",
        activityRecurringDay: 'Day of week',
        activityRecurringOff: 'Off (create sessions manually)',
        phonePickerPlaceholder: 'Fill from an admin number…',
        phonePickerSelf: 'My number',
        colActivity: 'Activity',
        createActivityBtn: 'Create Activity',
        updateActivityBtn: 'Save Changes',
        activityCreated: 'Activity created!',
        activityUpdated: 'Activity updated!',
        activityDeleted: 'Activity deactivated',
        activityCreateFailed: 'Failed to create activity',
        activityUpdateFailed: 'Failed to update activity',
        activityDeleteFailed: 'Failed to delete activity',
        activityDeleteHasDataError:
            'Cannot delete an activity that has sessions or payments. Deactivate it instead.',
        confirmDeactivateActivity:
            'Deactivate this activity? It will be hidden from members.',
        confirmActivateActivity: 'Reactivate this activity?',
        deactivate: 'Deactivate',
        activate: 'Activate',
        noActivity: 'No activities yet.',
        // The Applicants register (ticket #66). Column heads are the board's
        // own furniture, so they are set as tracked caps — and they double as
        // each cell's own label once the register collapses by axis, which is
        // why they have to read as a label on their own line too.
        colApplicant: 'Applicant',
        colAsked: 'Asked',
        colMembershipsPicked: 'Memberships picked',
        // Names the register for a screen reader; never drawn on screen.
        applicantsCaption: 'Applicants waiting for a decision',
        // The Activities register (ticket #71): Dues, Fee, Modes, Weekly
        // slot, Capacity, Floor and Bank, per the spec's audit-in-one-read
        // column set. `colMembers` is dropped with the member-count column.
        colDues: 'Dues',
        colFee: 'Fee',
        colModes: 'Modes',
        colWeeklySlot: 'Weekly slot',
        colCapacity: 'Capacity',
        colFloor: 'Floor',
        colBank: 'Bank',
        activitiesEmptyMark: 'Empty',
        activitiesCaption: 'Activities and how each is set up',
        // The attendance register (ticket #67) — one Session, every Seat on it,
        // one Save. The four state names are not repeated here: the control and
        // the chip beside it both read them off `chips.*`, so they cannot come
        // to disagree, and the stored `ABSENT` says Opted Out in both places.
        attendanceTitle: 'Attendance',
        // Names the surface for a screen reader; never drawn on screen.
        attendanceCaption: 'Attendance for this session',
        attendanceUntaken:
            'This session has ended and no attendance has been recorded. Everyone here is still Registered — nobody becomes a No-Show until you record one.',
        attendanceEmpty: 'Nobody holds a seat on this session.',
        attendanceEmptyMark: 'Empty',
        colParticipant: 'Participant',
        colPaymentMode: 'Payment mode',
        colSessionPayment: 'Payment',
        colRecorded: 'Recorded',
        colRecord: 'Record',
        attMoneyFree: 'No fee',
        attMoneyNone: 'Nothing sent',
        // Names one radio for a screen reader. A register runs forty rows deep,
        // and "Present" on its own does not say whose seat it is.
        attRowControlLabel: '{status} for {name}',
        attUnsaved: 'Unsaved',
        attSaveBtn: 'Save attendance',
        attChangedCount: '{n} changed',
        attNoChanges: 'Nothing changed yet',
        toAttendance: 'Take attendance',
        // The Payments queue (ticket #68). Column heads double as each cell's
        // own label once the register collapses by axis, so each has to read as
        // a label on its own line as well as across a head row.
        paymentsCaption: 'Payments waiting for a decision',
        paymentsEmptyMark: 'Empty',
        paymentsAwaiting: '{n} waiting for a decision',
        paymentsNoneAwaiting: 'nothing is waiting for a decision',
        colPeriod: 'Billing Period',
        colSent: 'Sent',
        // The two Proof cells that are not an image. Neither is ever a broken
        // image glyph, and neither is a chip: the register keeps every chip on
        // the standing column's shared edge.
        proofNone: 'No Proof',
        proofFailed: 'Failed to load',
        proofOpen: 'Open the Proof from {name}',
        proofDialogTitle: 'Proof from {name}',
        bankNotSet: 'No bank account set',
        paymentDecidedOn: 'Decided {date}',
        confirmPaymentTitle: 'Confirm this payment?',
        confirmPaymentDesc:
            'The member is told straight away, and the payment counts as settled.',
        // The shortfall warns and never blocks: admins take partial transfers
        // and cash top-ups today, and blocking would teach them to type a
        // figure that matches instead of the one that was sent.
        confirmBelowDues:
            'This is less than the Dues for {month} of {amount}. You can still Confirm.',
        confirmBelowFee:
            'This is less than the current Fee of {amount}. You can still Confirm.',
        rejectPaymentTitle: 'Reject this payment?',
        rejectPaymentDesc:
            'The member sees your reason and can send new proof.',
        rejectSeatConsequence:
            'Every seat this member is Registered for in {activity} sessions in {period} is released. Seats they attended or opted out of are untouched.',
        rejectReasonMissing:
            'No reason given. Write why you are rejecting this payment — the member sees it.',
        filterSearchLabel: 'Search by member name or email',
        filterMonthLabel: 'Filter by month',
        filterYearLabel: 'Filter by year',
        filterStatusLabel: 'Filter by status',
        filterActivityLabel: 'Filter by activity',
        // Nothing ever unsets a sort, so the default view — the whole point of
        // the surface — needs a way back that is not leaving and returning.
        paymentsQueueOrder: 'Back to the queue order',
        // The Members register (ticket #70). Column heads double as each cell's
        // own label once the register collapses by axis, so each has to read as
        // a label on its own line too.
        colContact: 'Contact',
        colMemberships: 'Memberships',
        colStanding: 'Standing',
        membersCaption: 'Members of this community',
        membersEmptyMark: 'Empty',
        membersSubtitle: '{n} members',
        membersNoMemberships: 'No activities',
        /**
         * The neutral chip on a monthly Membership: Dues owed for the current
         * Billing Period with nothing settled against it — nothing sent, or
         * only a Rejected Payment, which funds nothing either way. The same
         * word the member's own surfaces use for this state (`payments.unpaid`,
         * `profile.markNotPaid`), so the two never disagree. It is deliberately
         * not `chips.pending`, which means an Admin is holding a Proof.
         */
        standingOwed: 'Pending',
        /**
         * An Owner's contact details as an Admin sees them. Never a blank cell:
         * a blank reads as an unfilled profile and sends the Admin looking for
         * the number elsewhere, where the rule is what they will find.
         */
        contactWithheld: 'Withheld',
        ownerImmutable: 'This account cannot be changed.',
        memberDetailCaption: 'Activities, payment mode and attendance',
        memberDuesCaption: 'Dues sent by this member',
        memberAttendanceCaption: 'Recent sessions this member held a seat for',
        memberNoActivities: 'This member has joined no activities.',
        /**
         * A Membership on an Activity that offers both ways to pay, where the
         * member has picked neither yet. Not a mode and not a standing: there
         * is no obligation until they choose.
         */
        modeNotChosen: 'Not chosen',
        // The Sessions register (ticket #69). Column heads are reused from the
        // blocks above; these are the values only this register says, and the
        // sentences the locking rules state on the route and in the form.
        sessionsCaption: 'Sessions and where each one stands',
        sessionsEmptyMark: 'Empty',
        /**
         * The capacity and floor figures, spoken. `6/16` on its own does not say
         * which number is which, and a register runs forty rows deep.
         */
        seatsHeldSpoken: '{n} of {max} seats held',
        floorSpoken: '{n} of {needed} members committed',
        /**
         * An Activity that sets no minimum has no floor — a different fact from
         * a floor that has been met, which is what `0/0` would read as.
         */
        floorNone: 'No floor',
        /** Said in words beside the figure, so viability is never a colour. */
        floorShort: 'Below floor',
        cancelSessionBtn: 'Cancel session',
        confirmCancelSessionTitle: 'Cancel {title}?',
        confirmCancelSessionDesc:
            'Members see this session as cancelled, and afterwards nothing but its notes can be changed. Seats already held are not released.',
        sessionCancelled: 'Session cancelled.',
        sessionCancelFailed: 'This session could not be cancelled.',
        /**
         * The three refusals `PATCH /api/sessions/[id]` makes, each naming the
         * reason and the fix. The stable code travels beside the sentence in
         * `reason`; this is what the Admin actually reads.
         */
        refusedSessionClosed:
            'This session is completed or cancelled, so nothing but its notes can be changed. Undo the other changes and save the notes on their own.',
        refusedFeeLocked:
            'This session already has a payment or a held seat, so its fee cannot be changed. Post a new session at the new fee instead.',
        refusedCapacityBelowHeld:
            'Capacity cannot go below the {n} seats already held. Set it to {n} or higher, or release a seat first.',
        /** The same facts, said in the form beside the fields they lock. */
        capacityHeldFloor:
            'Capacity cannot go below the {n} seats already held on this session.',
        closedFieldsLocked:
            'This session is completed or cancelled, so only its notes can be changed here.',
        /**
         * The two refusals `DELETE /api/sessions/[id]` makes. A session with a
         * payment or a held seat behind it cannot be deleted at all, so the
         * sentence names cancelling as the move that was meant.
         */
        refusedSessionHasMoney:
            'This session has a payment or a held seat behind it, so it cannot be deleted. Cancel the session instead — the seats already held stay held.',
        refusedDeleteCompleted:
            'This session is completed, so it is part of the record and cannot be deleted.',
        /** A reopening refused because the day it was set for is over. */
        refusedSessionPast:
            'This session was set for a day that has already passed, so it cannot be reopened. Post a new session for the next date instead.',
        /** The one way back out of Cancelled, offered on the session row. */
        reopenSessionBtn: 'Reopen session',
        confirmReopenSessionTitle: 'Reopen {title}?',
        confirmReopenSessionDesc:
            'The session goes back to Scheduled and members can claim a seat again. Seats held when it was cancelled were never released, so they are still held.',
        sessionReopened: 'Session reopened.',
        sessionReopenFailed: 'This session could not be reopened.',
        /**
         * The Payments, Members and Activities registers each say which of two
         * facts an empty result reports, the same distinction the Sessions
         * register already makes (`noSessions` / `noSessionsMatch`).
         */
        noPaymentsMatch: 'No payments match your search.',
        noMembersMatch: 'No members match your search.',
        noActivityMatch: 'No activities match your search.',
        /**
         * The Dues Rate — what an Activity charges for Dues in one Billing
         * Period (spec #107, ADR 0002). "Dues rate" is admin-facing wording;
         * member-facing copy keeps saying "dues" with a figure and a month.
         */
        duesRateStartsFrom: 'Starts from',
        /**
         * A Period no rate row covers. Never an em dash, which means the
         * Activity does not offer Monthly, and never Rp 0, which would read as
         * a free month rather than a missing row.
         */
        duesRateNone: 'No rate set',
        /** The disclosure beneath the Dues field, nothing queued. */
        duesRateCurrentNote:
            'This activity charges {amount} a month. A new rate applies from the month you pick, never from a month that has already arrived.',
        /** The same disclosure once a change is queued: the figure and its month. */
        duesRateQueuedNote:
            'This activity charges {amount} a month, changing to {queued} from {month}.',
        /** No rate at all — a broken invariant, said plainly rather than hidden. */
        duesRateMissingNote:
            'This activity has no dues rate, so no month resolves to an amount. Save a rate to fix it.',
        duesRateWithdraw: 'Withdraw',
        duesRateWithdrawn: 'Queued dues change withdrawn.',
        duesRateWithdrawFailed:
            'This queued dues change could not be withdrawn.',
        /**
         * The three refusals the Dues Rate writes make, each naming the rule and
         * the fix. The stable code travels beside the sentence in `code`.
         */
        duesRateArrivedRefusal:
            'That month has already arrived, so what it charges is settled and cannot be changed. Pick a later month for the new rate.',
        duesRateOutOfRangeRefusal:
            'A new rate starts from next month at the earliest and twelve months ahead at the latest. Pick a month in that range.',
        duesRateNothingQueuedRefusal:
            'There is no queued dues change to withdraw. Reload the page to see what this activity charges now.',
    },
    activity: {
        label: 'Activity',
        filterAll: 'All Activities',
        selectPlaceholder: 'Select activity',
        yourActivity: 'Your Activities',
        yourActivitySub: 'Activities you have joined',
        join: 'Join',
        leave: 'Leave',
        joined: 'Joined',
        noneJoined: "You haven't joined any activity yet.",
        joinSuccess: 'Joined successfully',
        leaveSuccess: 'Left the activity',
        actionFailed: 'Action failed',
        notMember: 'You are not a member of this activity',
        membersCount: 'members',
    },
    /**
     * The curated Activity icon set (#164). One entry in `names` per key in
     * `src/lib/activity-icons.ts` — the picker indexes this by key, so a key
     * without a display name is a type error rather than an unlabelled button,
     * and `activity-icon-names.test.ts` asserts both locales cover the set.
     *
     * The names say what the glyph *is*, not what sport it stands for: the
     * library has no racket and one ball, so an Admin picking `feather` for
     * badminton has to be able to see that a feather is what they picked.
     */
    activityIcon: {
        label: 'Icon',
        hint: 'Shown wherever this activity is named. Leave it on no icon to show the first letter of the name instead.',
        none: 'No icon',
        names: {
            ball: 'Ball',
            goal: 'Goal net',
            feather: 'Feather',
            target: 'Target',
            dumbbell: 'Dumbbell',
            weight: 'Weight',
            bike: 'Bicycle',
            shoe: 'Sports shoe',
            footprints: 'Footprints',
            pool: 'Swimming pool',
            waves: 'Waves',
            mountain: 'Mountain',
            trees: 'Trees',
            trophy: 'Trophy',
            timer: 'Timer',
            users: 'People',
        },
    },
    paymentMode: {
        choosePrompt: 'Choose how you pay for this activity',
        monthly: 'Monthly',
        perSession: 'Per session',
        monthlyDesc: 'One flat fee each month',
        perSessionDesc: 'Pay for each session you join',
        youPay: 'You pay',
        perMonthSuffix: '/mo',
        perSessionSuffix: '/session',
        effectivePrefix: 'Effective',
        pendingNote: 'Change takes effect next period',
        noModesOffered: 'No payment mode is configured for this activity',
        saved: 'Payment mode updated',
        chooseAtRegistration:
            'Chosen when you register for a session. You can switch it there until you pay for the current period.',
    },
    common: {
        loading: 'Loading...',
        loadingSettings: 'Loading settings...',
        loadingProfile: 'Loading profile...',
        error: 'An error occurred',
        success: 'Success',
        cancel: 'Cancel',
        copy: 'Copy',
        copied: 'Copied',
        /** The neutral chip on `EmptyState` (#150) — a state, not a sentence. */
        empty: 'Empty',
        phoneCountryCodeHint:
            'Country code without + (e.g. 628123456789). A leading 08 is converted automatically.',
    },
    days: [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
    ],
    months: [
        '',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ],
    sessionStatus: {
        SCHEDULED: 'Scheduled',
        ONGOING: 'Ongoing',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
    },
    paymentStatus: {
        // The Admin queue's status filter. Reads the same word as the rows it
        // filters, which take theirs from `chips.pending`.
        PENDING: 'In review',
        CONFIRMED: 'Confirmed',
        REJECTED: 'Rejected',
    },
    attendanceStatus: {
        REGISTERED: 'Registered',
        MAYBE: 'Maybe',
        PRESENT: 'Present',
        // The stored enum member means the member released their own Seat —
        // Opted Out in the glossary. Never surfaced as "Absent".
        ABSENT: 'Opted Out',
    },
    // Labels for the five status chips. Keyed by ChipLabelKey so a state can
    // only name a label that ships in both languages.
    chips: {
        scheduled: 'Scheduled',
        ongoing: 'Ongoing',
        completed: 'Completed',
        cancelled: 'Cancelled',
        confirmed: 'Confirmed',
        /**
         * A Payment the member has sent Proof for and an Admin has not reviewed
         * yet. **In review**, because the member has already done their part and
         * someone else is holding it now.
         *
         * The word a member has not paid at all is **Pending** — money still
         * owed, nothing sent. Two states, two words, and neither borrows the
         * other's: see `payments.unpaid`, `profile.markNotPaid` and
         * `dashboard.duesPendingMark`, which are the neutral chips for that
         * one.
         *
         * This is the only label key a Payment's PENDING status resolves to
         * (`PAYMENT_CHIPS` in `status-chip.ts`), so every surface showing a
         * submitted Proof reads the same word.
         */
        pending: 'In review',
        rejected: 'Rejected',
        registered: 'Registered',
        maybe: 'Maybe',
        present: 'Present',
        optedOut: 'Opted Out',
        noShow: 'No-Show',
        unposted: 'Unposted',
    } satisfies Record<ChipLabelKey, string>,
    roles: {
        ADMIN: 'Admin',
        MEMBER: 'Member',
        OWNER: 'Owner',
    },
    table: {
        pagination: {
            previous: 'Previous',
            next: 'Next',
            pageOf: 'Page {page} of {total}',
            perPage: 'Per page',
            showAll: 'Show all',
            total: '{n} results',
        },
        sort: {
            asc: 'Sort ascending',
            desc: 'Sort descending',
        },
        search: {
            placeholder: 'Search...',
            btn: 'Search',
            memberPlaceholder: 'Search name or email...',
            titlePlaceholder: 'Search by title...',
            activityPlaceholder: 'Search by name or slug...',
        },
        filter: {
            allStatuses: 'All Statuses',
            allActivities: 'All Activities',
        },
    },
    validation: {
        nameMin: 'Name must be at least 2 characters',
        nameMax: 'Name cannot exceed 100 characters',
        phoneMin: 'Invalid phone number',
        phoneMax: 'Invalid phone number',
        phoneFormat: 'Phone number can only contain numbers',
        sessionTitleMin: 'Title must be at least 3 characters',
        sessionTitleMax: 'Title cannot exceed 200 characters',
        sessionDateRequired: 'Date is required',
        sessionTimeFormat: 'Invalid time format (HH:MM)',
        sessionEndAfterStart: 'End time must be after start time',
        communityNameRequired: 'Community name is required',
        sessionLocationMin: 'Location must be at least 3 characters',
        sessionLocationMax: 'Location cannot exceed 200 characters',
        sessionMaxPlayersMin: 'Minimum 2 players',
        sessionMaxPlayersMax: 'Maximum 100 players',
        sessionFeeMin: 'Fee cannot be negative',
        feeRequired: 'Fee is required',
        maxPlayersRequired: 'Max participants is required',
        minMembersMin: 'Minimum members cannot be negative',
        minMembersMax: 'Minimum members is too large',
        minMembersRequired: 'Minimum members is required (0 = no minimum)',
        paymentModeAtLeastOne: 'Enable at least one payment mode',
        paymentModeRequired: 'Select a payment mode',
        paymentModeNotOffered: 'This activity does not offer that payment mode',
        userIdRequired: 'User ID is required',
        paymentAmountMin: 'Payment amount must be greater than 0',
        fileRequired: 'File is required',
        fileTypeInvalid: 'Unsupported file format. Use JPG, PNG, or WebP.',
        fileSizeAvatar: 'Maximum file size is 2MB.',
        fileSizeProof: 'Maximum file size is 5MB.',
        monthYearInvalid: 'Invalid month/year',
        amountInvalid: 'Invalid payment amount',
        nameInvalid: 'Invalid name',
        activityNameMin: 'Name must be at least 2 characters',
        activityNameMax: 'Name cannot exceed 100 characters',
        activitySlugRequired: 'Slug is required',
        activitySlugFormat:
            'Slug can only contain lowercase letters, numbers, and dashes',
        activitySlugTaken: 'That slug is already in use',
        bankAccountNumberFormat: 'Account number can only contain digits',
        activityRequired: 'Select an activity',
        activityMembershipRequired: 'Select at least one activity',
        rejectReasonRequired: 'A rejection reason is required.',
    },
};

const id: typeof en = {
    brand: {
        defaultCommunityName: 'XClub Community',
        unnamedCommunity: 'Komunitas kami',
        defaultTitle: 'Komunitas',
        tagline: 'Manajemen XClub Community',
    },
    nav: {
        mainLabel: 'Menu Utama',
        adminLabel: 'Admin',
        dashboard: 'Dashboard',
        sessions: 'Sesi',
        payments: 'Pembayaran Iuran',
        profile: 'Profil Saya',
        signOut: 'Keluar',
        adminDashboard: 'Dashboard',
        adminSessions: 'Sesi',
        adminPayments: 'Pembayaran',
        adminApplicants: 'Pendaftar',
        adminMembers: 'Anggota',
        adminActivity: 'Aktivitas',
        adminSettings: 'Pengaturan',
        sessionsShort: 'Sesi',
        paymentsShort: 'Iuran',
        admin: 'Admin',
        memberView: 'Tampilan Anggota',
        navigationMenu: 'Menu Navigasi',
        toggleTheme: 'Ganti tema',
        lightMode: 'Mode Terang',
        darkMode: 'Tema',
    },
    landing: {
        hero: {
            // 41 characters, longest word 9. The budget is measured here, not
            // on the English: Indonesian runs 15–30% longer and is what the
            // hero has to hold.
            pitch: 'Ada permainan tiap minggu, dan tempatnya.',
            lead: 'Komunitas ini menjalankan sesi yang sama setiap minggu. Pilih yang kamu mau, datang, lalu bayar bagianmu.',
            cta: 'Minta gabung ke komunitas ini',
            disclosure:
                'Masuk dengan Google membuatkan akunmu saat pertama kali, dan mengajukan permintaanmu ke pengelola. Mereka yang memutuskan, dan kamu akan dapat email begitu itu terjadi.',
            alreadyMember: 'Sudah jadi anggota? Masuk',
        },
        board: {
            head: 'Yang bisa kamu mainkan di sini',
            body: 'Satu aktivitas, jadwal mingguannya, tempatnya, dan kapan berikutnya.',
            empty: 'Belum ada yang diposting di sini.',
            weeklyPrefix: 'Setiap',
            nextLabel: 'Berikutnya',
            free: 'Gratis',
            perMonth: '/ bulan',
            perSession: '/ sesi',
            cta: 'Minta gabung ke komunitas ini',
        },
        footer: 'Dijalankan oleh anggotanya.',
        meta: {
            description:
                'Ini halaman satu komunitas dan cara untuk minta gabung. Masuk dengan Google, dan pengelola yang memutuskan siapa yang masuk.',
            ogAlt: 'Nama komunitas, tercetak besar dengan huruf putih di atas hijau tua.',
        },
    },
    publicCopy: {
        sectionTitle: 'Halaman Publik',
        heroHeadlineLabel: 'Judul Utama',
        heroHeadlineHelper:
            'Baris pertama yang dibaca pengunjung. Kosongkan untuk memakai teks bawaan.',
        heroSublineLabel: 'Kalimat Pendukung',
        heroSublineHelper:
            'Satu kalimat di bawah judul utama. Kosongkan untuk memakai teks bawaan.',
        aboutLabel: 'Tentang komunitas ini',
        aboutHelper:
            'Satu paragraf singkat dengan kata-katamu sendiri. Ganti baris tetap dipertahankan. Kosongkan untuk tidak menampilkannya.',
        featureTitleLabel: 'Judul kartu {n}',
        featureLineLabel: 'Kalimat kartu {n}',
        featureHelper: 'Kartu tanpa judul tidak ditampilkan.',
        counter: '{count} / {max}',
        counterLabel: 'Karakter terpakai',
        lengthCapRefusal: 'Terlalu panjang — maksimal {max} karakter.',
        wordCapRefusal: 'Ada kata yang terlalu panjang — maksimal {max} huruf.',
    },
    auth: {
        signInTitle: 'Masuk',
        signInSubtitle: 'Sesi, RSVP, dan iuran untuk seluruh komunitasmu — dalam satu tempat.',
        signInButton: 'Lanjutkan dengan Google',
        signInNote:
            'Lanjut dengan Google akan membuatkan akunmu saat pertama kali kamu memakainya, dan mengajukan permintaanmu ke pengelola. Dengan masuk, kamu menyetujui aturan klub.',
        errorTitle: 'Gagal Masuk',
        errorMessage: 'Terjadi kesalahan saat proses login. Silakan coba lagi.',
        backToSignIn: 'Kembali ke halaman login',
    },
    onboarding: {
        title: 'Lengkapi Profil',
        subtitle: 'Lengkapi data kamu sebelum mulai.',
        welcome: 'Selamat datang di',
        welcomeSuffix: '!',
        name: 'Nama Lengkap',
        namePlaceholder: 'Masukkan nama lengkap',
        phone: 'Nomor WhatsApp',
        phonePlaceholder: 'Contoh: 628123456789',
        activityLabel: 'Pilih Aktivitas',
        activityHint: 'Pilih minimal satu aktivitas untuk diikuti.',
        submit: 'Simpan Profil',
        submitting: 'Menyimpan...',
        nameErrorTooShort: 'Isi nama kamu minimal 2 karakter.',
        nameErrorTooLong: 'Perpendek nama kamu menjadi maksimal 100 karakter.',
        phoneErrorTooShort:
            'Isi nomor WhatsApp kamu minimal 9 digit, misalnya 628123456789.',
        phoneErrorTooLong: 'Isi nomor WhatsApp kamu maksimal 15 digit.',
        phoneErrorInvalidChars:
            'Gunakan angka saja untuk nomor WhatsApp kamu — hapus spasi, tanda hubung, atau huruf.',
        activityErrorRequired: 'Pilih minimal satu aktivitas untuk melanjutkan.',
    },
    pending: {
        waitingMark: 'Menunggu',
        waitingTitle: 'Pengelola sedang meninjau permintaanmu',
        waitingLead:
            'Kamu sudah mengajukan diri untuk bergabung. Salah satu pengelola komunitas ini harus menerimamu dulu — biasanya dalam satu sampai dua hari. Kami akan mengirim email begitu itu terjadi.',
        declinedMark: 'Ditolak',
        declinedTitle: 'Kamu belum diterima masuk',
        declinedLead:
            'Pengelola sudah meninjau permintaanmu dan belum menerimamu. Kalau menurutmu ini keliru, hubungi mereka — keputusan ada di tangan mereka, dan mereka bisa berubah pikiran.',
        revokedMark: 'Dikeluarkan',
        revokedTitle: 'Tempatmu di komunitas ini sudah dicabut',
        revokedLead:
            'Pengelola mengeluarkanmu dari daftar anggota, jadi komunitas ini tidak lagi bisa kamu lihat. Hubungi mereka kalau kamu ingin kembali — keputusan ada di tangan mereka, dan mereka bisa berubah pikiran.',
        whatsapp: 'Hubungi pengelola',
        signOut: 'Keluar',
    },
    dashboard: {
        welcomeGreeting: 'Selamat datang kembali,',
        duesTitle: 'Iuran',
        duesNotPaid: 'Belum Dibayar',
        uploadProof: 'Upload Bukti',
        attendanceTitle: 'Kehadiran',
        sessions: 'sesi',
        attendanceRateTitle: 'Tingkat Kehadiran',
        thisMonth: 'bulan ini',
        upcomingLabel: 'Mendatang',
        unpaid: 'belum bayar',
        yourActivities: 'Aktivitas Anda',
        viewAllShort: 'Lihat semua',
        payNow: 'Bayar',
        duesUnpaidBanner: 'iuran belum dibayar',
        duesPendingMark: 'Pending',
        reservationsToPay: '{n} reservasi menunggu pembayaran',
        reservationsToPaySub: 'Bayar sebelum masa tahan habis atau kursi dilepas.',
        toPay: '{n} perlu dibayar',
        paid: 'Lunas',
        going: 'Ikut',
        rsvp: 'Daftar',
        upcomingTitle: 'Sesi Latihan Mendatang',
        noUpcoming: 'Belum ada sesi yang dijadwalkan.',
        registered: 'Terdaftar',
        full: 'Penuh',
        participants: 'peserta',
        viewAll: 'Lihat semua sesi →',
        feePerPerson: '/orang',
        duesChangeNotice: 'Iuran {activity} berubah menjadi {amount} mulai {month}',
    },
    insights: {
        emptyChip: 'Kosong',
        emptyMessage: 'Belum ada data untuk periode ini.',
        valuesToggle: 'Lihat nilai grafik sebagai teks',
        valuesListLabel: 'Nilai grafik',
    },
    sessions: {
        title: 'Sesi',
        subtitle: '',
        noSessions: 'Belum ada sesi yang dijadwalkan.',
        noPast: 'Belum ada sesi lampau.',
        chipAll: 'Semua',
        tabUpcoming: 'Mendatang',
        tabPast: 'Lampau',
        groupThisWeek: 'Minggu ini',
        groupLater: 'Nanti',
        registered: 'Terdaftar',
        going: 'Ikut',
        rsvp: 'Daftar',
        full: 'Penuh',
        participants: 'peserta',
        feePerPerson: '/orang',
        backToList: 'Kembali ke daftar sesi',
        backTitle: 'Sesi',
        participantsLabel: 'Peserta',
        playersLabel: 'Pemain',
        areYouPlaying: 'Kamu ikut main?',
        showAllPlayers: 'Lihat semua {n} pemain',
        mapLink: 'Peta',
        perPlayer: ' per pemain',
        durationHour: 'jam',
        durationHours: 'jam',
        maybe: 'Mungkin',
        cantMakeIt: 'Tidak bisa',
        rsvpCloses: 'RSVP tutup',
        rsvpClosed: 'RSVP ditutup',
        toastMaybeSuccess: 'Ditandai mungkin.',
        attendeeList: 'Daftar Peserta',
        noAttendees: 'Belum ada peserta yang mendaftar.',
        notesLabel: 'Catatan',
        register: 'Daftar',
        cancelRegistration: 'Batalkan Pendaftaran',
        sessionFull: 'Sesi Penuh',
        sessionCompleted: 'Sesi Selesai',
        sessionCancelled: 'Sesi Dibatalkan',
        registering: 'Mendaftar...',
        cancelling: 'Membatalkan...',
        toastRegisterSuccess: 'Berhasil mendaftar sesi!',
        toastCancelSuccess: 'Pendaftaran dibatalkan.',
        toastModeSwitched: 'Metode pembayaran diperbarui.',
        toastModeQueued: '{mode} berlaku mulai {period} — periode berjalan sudah dibayar, jadi harganya tidak berubah.',
        modeSwitchPending: 'Beralih ke {mode} mulai {period}',
        toastRegisterError: 'Gagal mendaftar',
        toastCancelError: 'Gagal membatalkan pendaftaran',
        registerAndPay: 'Daftar & bayar',
        payRequired: 'Perlu pembayaran — daftar & bayar untuk sesi ini.',
        notFound: 'Sesi tidak ditemukan.',
        notRegisterable: 'Sesi ini tidak dibuka untuk pendaftaran.',
        registeredPending: 'Terdaftar · menunggu konfirmasi',
        registeredPaid: 'Terdaftar · lunas',
        quotaLabel: 'kuota patungan',
        quotaMet: 'Kuota terpenuhi',
        quotaNeedMore: 'Butuh {n} lagi',
        contactAdmin: 'Hubungi Admin (WhatsApp)',
        joinDialogTitle: 'Pilih cara pembayaran',
        joinDialogDesc:
            'Bergabung di sesi ini otomatis bergabung ke aktivitasnya. Pilih opsi pembayaran:',
        joinMonthlyDesc:
            'Bayar iuran bulanan sekali — otomatis terdaftar di semua sesi bulan ini',
        joinPerSessionDesc: 'Bayar hanya sesi yang kamu ikuti',
        payMonthlyFirst: 'Bayar iuran bulanan dulu',
        paymentRejected: 'Pembayaran ditolak · upload ulang',
        changePaymentMode: 'Ganti metode pembayaran',
        cancelBlockedConfirmed:
            'Pembayaran yang sudah dikonfirmasi tidak bisa dibatalkan sendiri — hubungi admin.',
        viewMine: 'Aktivitas saya',
        viewAll: 'Semua aktivitas',
        noJoinedActivities:
            'Kamu belum bergabung ke aktivitas apa pun — beralih ke Semua untuk menjelajah.',
        chooseModeFirst: 'Pilih opsi pembayaran dulu.',
        reservedPayWithin: 'Dipesan · bayar dalam {time}',
        holdExpired: 'Reservasi kedaluwarsa',
        payNow: 'Bayar sekarang',
        publicPageRsvpCta: 'Masuk untuk daftar',
        shareSession: 'Bagikan sesi',
        shareSessionDesc: 'Ajak teman untuk bergabung di sesi ini',
        shareViaWhatsapp: 'Bagikan via WhatsApp',
        shareViaTwitter: 'Bagikan di X',
        copyLink: 'Salin tautan',
        linkCopied: 'Tersalin!',
        boardDaysShort: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
        boardLabel: 'Sesi per hari',
        boardWeekNavLabel: 'Ganti minggu',
        boardPrevWeek: 'Minggu sebelumnya',
        boardThisWeek: 'Minggu ini',
        boardNextWeek: 'Minggu berikutnya',
        boardWeekOf: '{start} – {end}',
        boardNothingMark: 'Kosong',
        boardNothingOnDay: 'Tidak ada apa pun di hari ini.',
        boardNotPosted: 'Admin belum mengumumkan sesi ini.',
        boardNeverPosted:
            'Belum ada sesi yang diumumkan. Sesi akan muncul di sini begitu Admin mengumumkan satu.',
        boardSeatsFree: 'Sisa',
        boardSeatsAria: '{n} dari {max} kursi tersisa',
        boardClaim: 'Ambil kursi',
        boardClaimAndPay: 'Ambil & bayar',
        boardClaimAria: 'Ambil kursi di {title}',
        boardWithdraw: 'Batal ikut',
        boardWithdrawAria: 'Batal ikut {title}',
        boardClaimed: 'Kursi diambil.',
        boardWithdrawn: 'Kursi dilepas — anggota lain bisa mengambilnya sekarang.',
        boardForfeited:
            'Kursi dilepas. Iuranmu menanggung satu bulan, bukan sesi ini, jadi tidak ada pengembalian dana.',
        boardChooseMode: 'Pilih dulu cara pembayaran untuk aktivitas ini.',
        boardOptedOut: 'Kamu melepas kursi ini.',
        duesForfeited:
            'Kamu batal ikut sesi ini. Iuranmu menanggung satu bulan, bukan sesi ini, jadi tidak ada pengembalian dana.',
        weekSeatsFigure: 'Sisa {n} dari {max}',
        weekSeatHeld: 'Dipesan',
        weekHoldPayBy: 'Bayar sebelum {time}',
        weekCardAria: '{day}, {time}, {activity}: {title}, {venue}. {status}',
    },
    payments: {
        title: 'Iuran Bulanan',
        subtitle: 'Riwayat pembayaran iuran kamu',
        uploadBtn: 'Upload Bukti',
        unpaidBannerTitle: 'belum dibayar',
        unpaidBannerSub: 'Segera upload bukti pembayaran kamu.',
        payNow: 'Bayar',
        unpaidDuesTitle: '{count} iuran belum dibayar untuk {month}',
        perMonth: '/bulan',
        paid: 'Lunas',
        unpaid: 'Pending',
        historyLabel: 'Riwayat',
        submitted: 'Dikirim',
        historyStatus: {
            PENDING: 'Ditinjau',
            CONFIRMED: 'Disetujui',
            REJECTED: 'Ditolak',
        },
        noPayments: 'Belum ada riwayat pembayaran.',
        uploadProofBtn: 'Upload Bukti Bayar',
        viewProof: 'Lihat Bukti',
        rejectReason: 'Alasan penolakan',
        rejectedRefundWarning:
            'Jika kamu sudah terlanjur transfer, hubungi admin via WhatsApp untuk pengembalian dana.',
        confirmedAt: 'Dikonfirmasi:',
        rejectedNote: 'Catatan penolakan:',
        backToHistory: 'Kembali ke riwayat iuran',
        uploadTitle: 'Upload Bukti Pembayaran',
        amountLabel: 'Jumlah',
        periodLabel: 'Periode',
        verifyNote: 'Admin akan memverifikasi pembayaran kamu dalam 24 jam.',
        submitReview: 'Kirim untuk ditinjau',
        uploadReceipt: 'Ketuk untuk upload bukti transfer',
        fileLabel: 'Bukti Pembayaran (Gambar)',
        fileDesc: 'JPG, PNG, WebP · Maks 5MB',
        noFileSelected: 'Belum ada file',
        submit: 'Kirim Pembayaran',
        submitting: 'Mengupload...',
        selectFile: 'Pilih file bukti pembayaran terlebih dahulu',
        toastSuccess:
            'Bukti pembayaran berhasil diupload! Menunggu konfirmasi admin.',
        toastError: 'Gagal mengupload bukti',
        selectImage: 'Klik untuk pilih gambar',
        amountLocked: 'Ditetapkan dari Iuran aktivitas ini untuk bulan ini',
        sessionAmountLocked: 'Ditetapkan dari biaya sesi ini',
        inReview: 'Ditinjau',
        transferTo: 'Transfer ke',
        noBankInfo:
            'Rekening pembayaran belum diatur untuk aktivitas ini — hubungi admin untuk info pembayaran.',
        owedFor: 'Iuran bulanan {activity} · {month} {year}',
        notMonthlyMode:
            'Kamu tidak menggunakan pembayaran bulanan untuk aktivitas ini pada periode ini.',
        noMonthlyFee: 'Aktivitas ini belum menetapkan Iuran untuk bulan ini.',
        noMonthlyActivity: 'Kamu tidak punya aktivitas dengan pembayaran bulanan.',
        notPerSessionMode:
            'Kamu tidak menggunakan pembayaran per sesi untuk sesi ini.',
        noSessionFee: 'Sesi ini belum menetapkan biaya.',
        sessionOwedFor: 'Biaya sesi {activity} · {session}',
        paySessionTitle: 'Daftar & bayar',
        rejectReasonPrompt: 'Masukkan alasan penolakan pembayaran ini',
        alreadyConfirmed: 'Pembayaran ini sudah dikonfirmasi.',
        outstandingReservations: 'Dipesan · bayar sekarang',
        payWithin: 'Bayar dalam {time}',
        modeUnchosenTitle: 'Kamu belum memilih cara pembayaran',
        modeUnchosenBody:
            'Kamu belum memilih cara pembayaran untuk {activities}, jadi belum ada iuran bulanan untuk {period}. Pilihan bulanan atau per sesi kamu tentukan saat mengambil kursi di sebuah sesi.',
        modeUnchosenAction: 'Pilih cara pembayaran',
        perSessionOnlyTitle: 'Tidak ada iuran bulanan di sini',
        perSessionOnlyBody:
            'Kamu membayar per sesi untuk {activities}, jadi tidak ada iuran bulanan untuk {period}. Biaya sesi dibayar dari sesinya sendiri, saat kamu mengambil kursi.',
        perSessionOnlyAction: 'Buka daftar sesi',
        noActivityTitle: 'Kamu belum bergabung di aktivitas mana pun',
        noActivityBody:
            'Iuran bulanan mengikuti aktivitas dan kamu belum bergabung di satu pun, jadi tidak ada yang perlu dibayar untuk {period}. Mengambil kursi di sebuah sesi otomatis menggabungkanmu ke aktivitasnya.',
        noActivityAction: 'Lihat daftar sesi',
        noBillingTitle: 'Metode pembayaran belum diatur',
        noBillingBody:
            'Belum ada metode pembayaran yang dikonfigurasi untuk {activities}, jadi belum ada yang bisa ditagih untuk {period}. Minta admin mengatur opsi pembayarannya.',
        periodLocked: 'Periode berjalan, mengikuti kalender',
        activityNotChosen:
            'Aktivitas belum dipilih. Pilih aktivitas yang iuran bulanannya kamu bayar, lalu kirim lagi.',
        proofMissing:
            'Bukti belum dilampirkan. Pilih foto atau tangkapan layar bukti transfer kamu, lalu kirim lagi.',
        proofFileFix:
            'Lampirkan foto atau tangkapan layar bukti transfer — JPG, PNG, atau WebP, maksimal 5MB.',
        duesLabel: 'Iuran',
        feeLabel: 'Biaya Sesi',
    },
    profile: {
        title: 'Profil',
        subtitle: 'Kelola informasi akun Anda',
        editTitle: 'Edit Informasi',
        editButton: 'Edit',
        name: 'Nama Lengkap',
        namePlaceholder: 'Nama Anda',
        phone: 'Nomor WhatsApp',
        phonePlaceholder: 'Contoh: 628123456789',
        save: 'Simpan Perubahan',
        saving: 'Menyimpan...',
        changePhotoAlt: 'Ganti foto profil',
        memberSince: 'Anggota sejak',
        membershipsLabel: 'Keanggotaan',
        noMemberships: 'Belum ada aktivitas',
        joinedPrefix: 'Bergabung',
        accountLabel: 'Akun',
        phoneRow: 'Nomor telepon',
        phoneNotSet: 'Belum diatur',
        language: 'Bahasa',
        theme: 'Tema',
        themeLight: 'Terang',
        themeDark: 'Gelap',
        roleAdmin: 'Admin',
        roleMember: 'Anggota',
        toastSuccess: 'Profil berhasil diperbarui!',
        toastPhotoSuccess: 'Foto profil berhasil diperbarui!',
        toastPhotoError: 'Gagal mengupload foto',
        leaveButton: 'Keluar',
        leaveTitle: 'Keluar dari {name}?',
        leaveBody:
            'Anda akan dikeluarkan dari aktivitas ini. Sesi mendatang yang belum Anda bayar akan dilepas. Sesi yang sudah Anda bayar dan dikonfirmasi tetap terpesan. Iuran yang sudah dibayar tidak dikembalikan.',
        leaveConfirm: 'Keluar dari aktivitas',
        leaveToast: 'Anda keluar dari {name}',
        // Metode pembayaran per aktivitas, dan kapan perubahannya berlaku.
        membershipsHint:
            'Pembayaran diatur per aktivitas. Mengubah satu aktivitas tidak mengubah yang lain.',
        modeLegend: 'Cara Anda membayar {name}',
        modeDuesLabel: 'Iuran',
        modeFeeLabel: 'Biaya Sesi',
        modeNoneChosen: 'Belum dipilih',
        modeSingleOffered: 'Aktivitas ini hanya punya satu cara pembayaran.',
        modeSaveButton: 'Simpan cara pembayaran',
        currentPeriodRowLabel: 'Periode Tagihan ini',
        markNotPaid: 'Pending',
        modeEffectNow: 'Berlaku sekarang, untuk Periode Tagihan {period}.',
        modeEffectNext:
            'Berlaku mulai Periode Tagihan {next}. {current} sudah dibayar dan tidak berubah.',
        modeEffectUnchanged:
            'Sudah menjadi cara Anda membayar untuk Periode Tagihan {period}.',
        modeEffectCancels:
            'Membatalkan perubahan yang dijadwalkan untuk {next}. Anda tetap memakai ini sejak {current}.',
    },
    admin: {
        dashboardTitle: 'Admin Dashboard',
        dashboardSubtitle: 'Ringkasan aktivitas komunitas',
        totalMembers: 'Total Anggota',
        activeMembers: 'Anggota Aktif',
        upcomingSessions: 'Sesi Mendatang',
        pendingPayments: 'Iuran Pending',
        confirmedThisMonth: 'Terkonfirmasi (bulan ini)',
        inactive: 'tidak aktif',
        needsConfirmation: 'menunggu konfirmasi',
        perActivityTitle: 'Rincian per Aktivitas',
        upcomingShort: 'Mendatang',
        pendingShort: 'Pending',
        greetingMorning: 'Selamat pagi',
        greetingAfternoon: 'Selamat siang',
        greetingEvening: 'Selamat malam',
        dashboardHeaderSub: 'Ringkasan aktivitas komunitas kamu',
        statActiveMembers: 'Member aktif',
        statSessionsThisWeek: 'Sesi minggu ini',
        statCollected: 'Terkumpul',
        newThisMonth: '+{n} bulan ini',
        acrossActivities: 'di {n} aktivitas',
        ofDue: 'dari {amount} tagihan',
        needReview: 'perlu ditinjau',
        needsAttentionTitle: 'Perlu perhatian',
        itemsCount: '{n} item',
        allClear: 'Aman — tidak ada yang perlu perhatian saat ini.',
        pendingProofsItem: '{n} bukti pembayaran menunggu ditinjau',
        pendingProofsSub: 'Tinjau dan konfirmasi agar iuran tetap lancar',
        underBookedItem: '{title} kurang peserta — {n} dari {max}',
        rsvpClosesInDays: 'RSVP tutup dalam {n} hari',
        remindMembers: 'Ingatkan anggota',
        remindSectionTitle: 'Ingatkan anggota',
        remindSectionDesc: 'Kirim email pengingat ke anggota aktif yang belum mendaftar di sesi ini.',
        remindCooldown: 'Pengingat dikirim {n} jam lalu · tersedia lagi dalam {remaining} jam',
        remindConfirmTitle: 'Kirim email pengingat?',
        remindConfirmDesc:
            'Email akan dikirim ke semua anggota aktif yang belum mendaftar di sesi ini.',
        remindSendBtn: 'Kirim pengingat',
        remindSending: 'Mengirim...',
        remindSuccessToast: 'Pengingat dikirim ke {n} anggota.',
        remindSkippedToast: '{n} anggota dilewati (tidak ada email).',
        remindErrorToast: 'Gagal mengirim pengingat. Coba lagi.',
        shareSession: 'Bagikan sesi',
        shareSessionDesc: 'Bagikan tautan ini untuk mengundang member baru',
        copyLink: 'Salin tautan',
        linkCopied: 'Tersalin!',
        shareViaWhatsapp: 'Bagikan via WhatsApp',
        shareViaTwitter: 'Bagikan di X',
        reviewAction: 'Tinjau',
        thisWeekTitle: 'Minggu ini',
        allSessionsLink: 'Semua sesi',
        noSessionsThisWeek: 'Belum ada sesi minggu ini.',
        attendanceMetric: 'kehadiran',
        sessionsPerWeek: 'sesi / mgg',
        duesCollectedLabel: 'Iuran terkumpul',
        membersSuffix: 'member',
        sessionsTitle: 'Kelola Sesi',
        sessionsSubtitle: 'Buat dan kelola sesi latihan',
        newSession: 'Buat Sesi',
        colSession: 'Sesi',
        colDate: 'Tanggal',
        colLocation: 'Lokasi',
        colStatus: 'Status',
        colActions: 'Aksi',
        detail: 'Detail',
        edit: 'Edit',
        noSessions: 'Belum ada sesi.',
        noSessionsMatch: 'Tidak ada sesi yang cocok dengan pencarian.',
        applicantsTitle: 'Mengajukan diri untuk bergabung',
        applicantsSubtitle: '{n} menunggu keputusan',
        applicantsHint:
            'Mereka belum bisa melihat apa pun sampai kamu menerima mereka',
        applicantsEmpty: 'Tidak ada yang menunggu.',
        applicantsEmptyMark: 'Kosong',
        applicantsToRoster: 'Kembali ke daftar anggota',
        applicantPhone: 'WhatsApp',
        applicantWants: 'Ingin ikut',
        applicantWaited: 'Menunggu',
        waitedToday: 'hari ini',
        waitedDays: '{n} hari',
        admit: 'Terima',
        decline: 'Tolak',
        admitConfirmTitle: 'Terima {name}?',
        admitConfirmDesc:
            'Dia langsung bisa masuk ke komunitas, dan menerima email pemberitahuan.',
        declineConfirmTitle: 'Tolak {name}?',
        declineConfirmDesc:
            'Dia tetap masuk dengan akunnya tetapi hanya melihat halaman yang menyatakan pengelola belum menerimanya, dan keluar dari daftar tunggu ini. Tidak ada email yang dikirim.',
        admittedToast: '{name} sudah diterima.',
        declinedToast: '{name} ditolak.',
        membersTitle: 'Kelola Anggota',
        searchPlaceholder: 'Cari nama atau email...',
        searchBtn: 'Cari',
        colName: 'Nama',
        colRole: 'Peran',
        active: 'Aktif',
        inactive2: 'Nonaktif',
        profileIncomplete: 'Profil Belum Lengkap',
        colPhone: 'Telepon',
        noMembers: 'Anggota tidak ditemukan.',
        memberDetailBack: 'Kembali ke daftar anggota',
        memberNameEmpty: '(Belum diisi)',
        memberJoined: 'Bergabung',
        attendanceHistory: 'Riwayat Kehadiran',
        noAttendanceData: 'Belum ada data kehadiran.',
        duesHistory: 'Riwayat Iuran',
        noDuesData: 'Belum ada data iuran.',
        paymentsTitle: 'Kelola Iuran',
        paymentsSubtitle: 'Konfirmasi atau tolak bukti pembayaran',
        allMonths: 'Semua Bulan',
        allStatuses: 'Semua Status',
        allYears: 'Semua Tahun',
        filterBtn: 'Filter',
        exportCSV: 'Export CSV',
        csvHeaders: {
            no: 'No',
            name: 'Nama',
            email: 'Email',
            whatsapp: 'WhatsApp',
            status: 'Status',
            registeredAt: 'Waktu Daftar',
            activity: 'Aktivitas',
            month: 'Bulan',
            year: 'Tahun',
            amount: 'Jumlah (Rp)',
            uploadedAt: 'Tanggal Upload',
            confirmedAt: 'Tanggal Konfirmasi',
        },
        settingsTitle: 'Pengaturan Komunitas',
        settingsSubtitle: 'Konfigurasi default komunitas',
        communityNameLabel: 'Nama Komunitas',
        defaultLocationLabel: 'Lokasi Default / GOR',
        defaultLocationPlaceholder: 'Contoh: GOR Serbaguna Kelurahan X',
        adminWhatsappLabel: 'Nomor WhatsApp Admin',
        whatsappHint: 'Format: kode negara tanpa + (contoh: 628...)',
        holdDurationLabel: 'Durasi batas bayar reservasi',
        holdDurationHint:
            'Berapa lama kursi yang dipesan menunggu pembayaran sebelum dilepas.',
        holdDuration60: '1 jam',
        holdDuration30: '30 menit',
        holdDuration15: '15 menit',
        holdDurationCustom: 'Custom',
        holdDurationCustomLabel: 'Durasi custom (menit)',
        logoLabel: 'Logo Komunitas',
        logoHint: 'JPG, PNG, WebP · Maks 2MB',
        logoUpload: 'Upload Logo',
        logoChange: 'Ganti Logo',
        logoUploading: 'Mengupload...',
        logoSuccess: 'Logo berhasil diperbarui!',
        logoFail: 'Gagal mengupload logo',
        saveSettings: 'Simpan Pengaturan',
        saving: 'Menyimpan...',
        newSessionTitle: 'Buat Sesi Baru',
        backToSessions: 'Kembali ke daftar sesi',
        formTitle: 'Judul Sesi',
        formDate: 'Tanggal',
        formStartTime: 'Waktu Mulai',
        formEndTime: 'Waktu Selesai',
        formLocation: 'Lokasi',
        formMaxPlayers: 'Maks Peserta',
        formFee: 'Iuran Sesi (Rp)',
        formNotes: 'Catatan (Opsional)',
        createBtn: 'Buat Sesi',
        creating: 'Membuat...',
        editSessionTitle: 'Edit Sesi',
        updateBtn: 'Perbarui Sesi',
        updating: 'Memperbarui...',
        deleteBtn: 'Hapus Sesi',
        confirmDelete:
            'Yakin ingin menghapus sesi ini? Semua data absensi akan ikut terhapus.',
        markAllPresent: 'Tandai Semua Hadir',
        attendanceUpdated: 'Status kehadiran diperbarui',
        attendanceUpdateFailed: 'Gagal mengubah kehadiran',
        sessionUpdated: 'Sesi berhasil diperbarui!',
        sessionDeleted: 'Sesi dihapus',
        sessionUpdateFailed: 'Gagal menyimpan',
        sessionDeleteFailed: 'Gagal menghapus sesi',
        sessionCreated: 'Sesi berhasil dibuat!',
        sessionCreateFailed: 'Gagal membuat sesi',
        activityLocked: 'Aktivitas tidak bisa diubah setelah sesi dibuat.',
        feeLocked:
            'Biaya ini tidak bisa diubah: sesi ini sudah punya pembayaran atau kursi yang dipegang.',
        sessionCreateHint: 'Aktivitas dan iuran memiliki batasan setelah sesi dibuat — lihat di bawah.',
        memberUpdated: 'Berhasil diperbarui',
        memberUpdateFailed: 'Gagal memperbarui',
        paymentConfirmed: 'Pembayaran dikonfirmasi',
        paymentRejected: 'Pembayaran ditolak',
        paymentUpdateFailed: 'Gagal memperbarui status',
        paymentAlreadyReviewed: 'Pembayaran ini sudah ditinjau.',
        confirmReject: 'Yakin ingin menolak pembayaran ini?',
        deactivateMember: 'Non-aktifkan',
        activateMember: 'Aktifkan',
        deactivateConfirmTitle: 'Non-aktifkan {name}?',
        deactivateConfirmDesc:
            'Akses ke semua aktivitas dan RSVP mendatang akan hilang. Riwayat pembayaran tetap tersimpan.',
        typeToConfirmPrompt: 'Ketik {word} untuk konfirmasi',
        typeToConfirmWord: 'nonaktifkan',
        makeAdmin: 'Jadikan Admin',
        makeMember: 'Jadikan Member',
        roleChangeConfirmTitle: 'Ubah role {name}?',
        roleChangeConfirmDesc:
            'Admin dapat mengelola sesi, pembayaran, member, dan pengaturan.',
        settingsSaved: 'Pengaturan berhasil disimpan!',
        settingsFailed: 'Gagal menyimpan pengaturan',
        proof: 'Bukti',
        confirmBtn: 'Konfirmasi',
        rejectBtn: 'Tolak',
        colMember: 'Anggota',
        colAmount: 'Jumlah',
        noPayments: 'Tidak ada pembayaran ditemukan.',
        activityTitle: 'Kelola Aktivitas',
        activitySubtitle: 'Buat dan kelola aktivitas',
        activityRegistered: 'aktivitas',
        newActivity: 'Buat Aktivitas',
        editActivity: 'Edit Aktivitas',
        activityName: 'Nama',
        activityNamePlaceholder: 'Contoh: Yoga, Futsal, Lari',
        activitySlug: 'Slug',
        activitySlugHint: 'Id ramah-URL, contoh "klub-yoga"',
        activitySlugPlaceholder: 'klub-yoga',
        activityDescription: 'Deskripsi (Opsional)',
        activityFee: 'Tarif Iuran (Rp)',
        activitySessionFee: 'Biaya Per Sesi (Rp)',
        activityPaymentModes: 'Metode Pembayaran',
        activityModeMonthly: 'Bulanan',
        activityModePerSession: 'Per Sesi',
        activityLocation: 'Lokasi Default',
        activityMaxPlayers: 'Maks Peserta Default',
        activityWhatsapp: 'WhatsApp Admin',
        activityBankName: 'Bank',
        activityBankNamePlaceholder: 'Contoh: BCA',
        activityBankNumber: 'Nomor Rekening',
        activityBankHolder: 'Atas Nama',
        activityBankHint:
            'Member melihat rekening ini (dengan tombol salin) saat upload pembayaran. Kosongkan untuk menyembunyikan.',
        sectionBasicInfo: 'Info Dasar',
        sectionPayment: 'Pembayaran & Iuran',
        sectionSchedule: 'Sesi & Jadwal',
        sectionContact: 'Kontak Admin',
        sectionScheduleLocation: 'Jadwal & Lokasi',
        sectionParticipantsFee: 'Peserta & Biaya',
        activityMinMembers: 'Minimal anggota',
        activityMinMembersHint:
            'Jumlah anggota membayar per sesi untuk menutup biaya patungan, mis. sewa GOR (0 = tanpa minimum)',
        activityRecurringTitle: 'Jadwal sesi mingguan otomatis',
        activityRecurringHint:
            'Sesi mingguan bulan ini dibuat otomatis pada hari terpilih (mode Bulanan).',
        activityRecurringDay: 'Hari',
        activityRecurringOff: 'Nonaktif (buat sesi manual)',
        phonePickerPlaceholder: 'Isi dari nomor admin…',
        phonePickerSelf: 'Nomor saya',
        colActivity: 'Aktivitas',
        createActivityBtn: 'Buat Aktivitas',
        updateActivityBtn: 'Simpan Perubahan',
        activityCreated: 'Aktivitas berhasil dibuat!',
        activityUpdated: 'Aktivitas diperbarui!',
        activityDeleted: 'Aktivitas dinonaktifkan',
        activityCreateFailed: 'Gagal membuat aktivitas',
        activityUpdateFailed: 'Gagal memperbarui aktivitas',
        activityDeleteFailed: 'Gagal menghapus aktivitas',
        activityDeleteHasDataError:
            'Tidak bisa menghapus aktivitas yang punya sesi atau pembayaran. Nonaktifkan saja.',
        confirmDeactivateActivity:
            'Nonaktifkan aktivitas ini? Akan disembunyikan dari anggota.',
        confirmActivateActivity: 'Aktifkan kembali aktivitas ini?',
        deactivate: 'Nonaktifkan',
        activate: 'Aktifkan',
        noActivity: 'Belum ada aktivitas.',
        colApplicant: 'Pendaftar',
        colAsked: 'Mengajukan',
        colMembershipsPicked: 'Keanggotaan dipilih',
        applicantsCaption: 'Pendaftar yang menunggu keputusan',
        colDues: 'Iuran',
        colFee: 'Biaya',
        colModes: 'Metode',
        colWeeklySlot: 'Jadwal Mingguan',
        colCapacity: 'Kapasitas',
        colFloor: 'Batas Minimum',
        colBank: 'Bank',
        activitiesEmptyMark: 'Kosong',
        activitiesCaption: 'Aktivitas dan cara masing-masing diatur',
        attendanceTitle: 'Kehadiran',
        attendanceCaption: 'Kehadiran untuk sesi ini',
        attendanceUntaken:
            'Sesi ini sudah berakhir dan kehadiran belum dicatat. Semua di sini masih Terdaftar — tidak ada yang menjadi Tidak Hadir sampai kamu mencatatnya.',
        attendanceEmpty: 'Belum ada yang memegang kursi di sesi ini.',
        attendanceEmptyMark: 'Kosong',
        colParticipant: 'Peserta',
        colPaymentMode: 'Metode pembayaran',
        colSessionPayment: 'Pembayaran',
        colRecorded: 'Tercatat',
        colRecord: 'Catat',
        attMoneyFree: 'Tanpa iuran',
        attMoneyNone: 'Belum dikirim',
        attRowControlLabel: '{status} untuk {name}',
        attUnsaved: 'Belum disimpan',
        attSaveBtn: 'Simpan kehadiran',
        attChangedCount: '{n} diubah',
        attNoChanges: 'Belum ada perubahan',
        toAttendance: 'Catat kehadiran',
        paymentsCaption: 'Pembayaran yang menunggu keputusan',
        paymentsEmptyMark: 'Kosong',
        paymentsAwaiting: '{n} menunggu keputusan',
        paymentsNoneAwaiting: 'tidak ada yang menunggu keputusan',
        colPeriod: 'Periode Tagihan',
        colSent: 'Dikirim',
        proofNone: 'Tidak ada bukti',
        proofFailed: 'Gagal dimuat',
        proofOpen: 'Buka bukti dari {name}',
        proofDialogTitle: 'Bukti dari {name}',
        bankNotSet: 'Rekening bank belum diatur',
        paymentDecidedOn: 'Diputuskan {date}',
        confirmPaymentTitle: 'Konfirmasi pembayaran ini?',
        confirmPaymentDesc:
            'Anggota langsung diberi tahu, dan pembayaran dihitung lunas.',
        confirmBelowDues:
            'Jumlah ini kurang dari Iuran {month} sebesar {amount}. Kamu tetap bisa Konfirmasi.',
        confirmBelowFee:
            'Jumlah ini kurang dari Biaya Sesi saat ini sebesar {amount}. Kamu tetap bisa Konfirmasi.',
        rejectPaymentTitle: 'Tolak pembayaran ini?',
        rejectPaymentDesc:
            'Anggota melihat alasanmu dan bisa mengirim bukti baru.',
        rejectSeatConsequence:
            'Semua kursi yang Terdaftar atas nama anggota ini di sesi {activity} pada {period} akan dilepas. Kursi yang sudah dihadiri atau dibatalkan tidak terpengaruh.',
        rejectReasonMissing:
            'Alasan belum diisi. Tulis alasan kamu menolak pembayaran ini — anggota akan membacanya.',
        filterSearchLabel: 'Cari nama atau email anggota',
        filterMonthLabel: 'Saring menurut bulan',
        filterYearLabel: 'Saring menurut tahun',
        filterStatusLabel: 'Saring menurut status',
        filterActivityLabel: 'Saring menurut aktivitas',
        paymentsQueueOrder: 'Kembali ke urutan antrean',
        colContact: 'Kontak',
        colMemberships: 'Keanggotaan',
        colStanding: 'Status iuran',
        membersCaption: 'Anggota komunitas ini',
        membersEmptyMark: 'Kosong',
        membersSubtitle: '{n} anggota',
        membersNoMemberships: 'Belum ada aktivitas',
        standingOwed: 'Pending',
        contactWithheld: 'Dirahasiakan',
        ownerImmutable: 'Akun ini tidak bisa diubah.',
        memberDetailCaption: 'Aktivitas, cara pembayaran, dan kehadiran',
        memberDuesCaption: 'Iuran yang dikirim anggota ini',
        memberAttendanceCaption: 'Sesi terakhir yang kursinya dipegang anggota ini',
        memberNoActivities: 'Anggota ini belum mengikuti aktivitas apa pun.',
        modeNotChosen: 'Belum dipilih',
        sessionsCaption: 'Sesi dan posisi masing-masing',
        sessionsEmptyMark: 'Kosong',
        seatsHeldSpoken: '{n} dari {max} kursi terisi',
        floorSpoken: '{n} dari {needed} anggota terkumpul',
        floorNone: 'Tanpa batas minimum',
        floorShort: 'Di bawah batas minimum',
        cancelSessionBtn: 'Batalkan sesi',
        confirmCancelSessionTitle: 'Batalkan {title}?',
        confirmCancelSessionDesc:
            'Anggota melihat sesi ini sebagai dibatalkan, dan setelah itu hanya catatannya yang bisa diubah. Kursi yang sudah dipegang tidak dilepas.',
        sessionCancelled: 'Sesi dibatalkan.',
        sessionCancelFailed: 'Sesi ini tidak bisa dibatalkan.',
        refusedSessionClosed:
            'Sesi ini sudah selesai atau dibatalkan, jadi hanya catatannya yang bisa diubah. Batalkan perubahan lain dan simpan catatannya saja.',
        refusedFeeLocked:
            'Sesi ini sudah punya pembayaran atau kursi yang dipegang, jadi biayanya tidak bisa diubah. Buat sesi baru dengan biaya yang baru.',
        refusedCapacityBelowHeld:
            'Kapasitas tidak bisa kurang dari {n} kursi yang sudah dipegang. Isi {n} atau lebih, atau lepas satu kursi dulu.',
        capacityHeldFloor:
            'Kapasitas tidak bisa kurang dari {n} kursi yang sudah dipegang di sesi ini.',
        closedFieldsLocked:
            'Sesi ini sudah selesai atau dibatalkan, jadi hanya catatannya yang bisa diubah di sini.',
        refusedSessionHasMoney:
            'Sesi ini punya pembayaran atau kursi yang dipegang, jadi tidak bisa dihapus. Batalkan sesinya saja — kursi yang sudah dipegang tetap dipegang.',
        refusedDeleteCompleted:
            'Sesi ini sudah selesai, jadi sudah menjadi catatan dan tidak bisa dihapus.',
        refusedSessionPast:
            'Sesi ini dijadwalkan pada hari yang sudah lewat, jadi tidak bisa dibuka kembali. Buat sesi baru untuk tanggal berikutnya.',
        reopenSessionBtn: 'Buka kembali sesi',
        confirmReopenSessionTitle: 'Buka kembali {title}?',
        confirmReopenSessionDesc:
            'Sesi kembali menjadi Terjadwal dan anggota bisa mengambil kursi lagi. Kursi yang dipegang saat sesi dibatalkan tidak pernah dilepas, jadi masih dipegang.',
        sessionReopened: 'Sesi dibuka kembali.',
        sessionReopenFailed: 'Sesi ini tidak bisa dibuka kembali.',
        noPaymentsMatch: 'Tidak ada pembayaran yang cocok dengan pencarian.',
        noMembersMatch: 'Tidak ada anggota yang cocok dengan pencarian.',
        noActivityMatch: 'Tidak ada aktivitas yang cocok dengan pencarian.',
        duesRateStartsFrom: 'Mulai dari',
        duesRateNone: 'Belum ada tarif',
        duesRateCurrentNote:
            'Aktivitas ini menagih {amount} per bulan. Tarif baru berlaku mulai bulan yang kamu pilih, tidak pernah dari bulan yang sudah berjalan.',
        duesRateQueuedNote:
            'Aktivitas ini menagih {amount} per bulan, berubah menjadi {queued} mulai {month}.',
        duesRateMissingNote:
            'Aktivitas ini belum punya tarif iuran, jadi tidak ada bulan yang menghasilkan nominal. Simpan satu tarif untuk memperbaikinya.',
        duesRateWithdraw: 'Tarik kembali',
        duesRateWithdrawn: 'Perubahan iuran yang antre ditarik kembali.',
        duesRateWithdrawFailed:
            'Perubahan iuran yang antre ini tidak bisa ditarik kembali.',
        duesRateArrivedRefusal:
            'Bulan itu sudah berjalan, jadi nominalnya sudah final dan tidak bisa diubah. Pilih bulan setelahnya untuk tarif baru.',
        duesRateOutOfRangeRefusal:
            'Tarif baru paling cepat mulai bulan depan dan paling lambat dua belas bulan ke depan. Pilih bulan dalam rentang itu.',
        duesRateNothingQueuedRefusal:
            'Tidak ada perubahan iuran yang antre untuk ditarik kembali. Muat ulang halaman untuk melihat tarif aktivitas ini sekarang.',
    },
    activity: {
        label: 'Aktivitas',
        filterAll: 'Semua Aktivitas',
        selectPlaceholder: 'Pilih aktivitas',
        yourActivity: 'Aktivitas Kamu',
        yourActivitySub: 'Aktivitas yang kamu ikuti',
        join: 'Gabung',
        leave: 'Keluar',
        joined: 'Tergabung',
        noneJoined: 'Kamu belum bergabung di aktivitas mana pun.',
        joinSuccess: 'Berhasil bergabung',
        leaveSuccess: 'Berhasil keluar dari aktivitas',
        actionFailed: 'Aksi gagal',
        notMember: 'Kamu bukan anggota aktivitas ini',
        membersCount: 'anggota',
    },
    activityIcon: {
        label: 'Ikon',
        hint: 'Tampil di mana pun aktivitas ini disebut. Biarkan tanpa ikon untuk menampilkan huruf pertama namanya.',
        none: 'Tanpa ikon',
        names: {
            ball: 'Bola',
            goal: 'Gawang',
            feather: 'Bulu',
            target: 'Sasaran',
            dumbbell: 'Dumbel',
            weight: 'Beban',
            bike: 'Sepeda',
            shoe: 'Sepatu olahraga',
            footprints: 'Jejak kaki',
            pool: 'Kolam renang',
            waves: 'Ombak',
            mountain: 'Gunung',
            trees: 'Pepohonan',
            trophy: 'Piala',
            timer: 'Pengatur waktu',
            users: 'Orang',
        },
    },
    paymentMode: {
        choosePrompt: 'Pilih cara kamu membayar aktivitas ini',
        monthly: 'Bulanan',
        perSession: 'Per sesi',
        monthlyDesc: 'Satu biaya tetap tiap bulan',
        perSessionDesc: 'Bayar tiap sesi yang kamu ikuti',
        youPay: 'Kamu membayar',
        perMonthSuffix: '/bln',
        perSessionSuffix: '/sesi',
        effectivePrefix: 'Berlaku',
        pendingNote: 'Perubahan berlaku mulai periode berikutnya',
        noModesOffered: 'Tidak ada metode pembayaran yang dikonfigurasi untuk aktivitas ini',
        saved: 'Metode pembayaran diperbarui',
        chooseAtRegistration:
            'Dipilih saat mendaftar ke sesi. Bisa diganti di sana selama kamu belum membayar periode berjalan.',
    },
    common: {
        loading: 'Memuat...',
        loadingSettings: 'Memuat pengaturan...',
        loadingProfile: 'Memuat profil...',
        error: 'Terjadi kesalahan',
        success: 'Berhasil',
        cancel: 'Batal',
        copy: 'Salin',
        copied: 'Tersalin',
        empty: 'Kosong',
        phoneCountryCodeHint:
            'Kode negara tanpa + (contoh: 628123456789). Awalan 08 dikonversi otomatis.',
    },
    days: [
        'Minggu',
        'Senin',
        'Selasa',
        'Rabu',
        'Kamis',
        'Jumat',
        'Sabtu',
    ],
    months: [
        '',
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
        'Juli',
        'Agustus',
        'September',
        'Oktober',
        'November',
        'Desember',
    ],
    sessionStatus: {
        SCHEDULED: 'Terjadwal',
        ONGOING: 'Berlangsung',
        COMPLETED: 'Selesai',
        CANCELLED: 'Dibatalkan',
    },
    paymentStatus: {
        PENDING: 'Ditinjau',
        CONFIRMED: 'Lunas',
        REJECTED: 'Ditolak',
    },
    attendanceStatus: {
        REGISTERED: 'Terdaftar',
        MAYBE: 'Mungkin',
        PRESENT: 'Hadir',
        ABSENT: 'Batal Ikut',
    },
    chips: {
        scheduled: 'Terjadwal',
        ongoing: 'Berlangsung',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
        confirmed: 'Lunas',
        pending: 'Ditinjau',
        rejected: 'Ditolak',
        registered: 'Terdaftar',
        maybe: 'Mungkin',
        present: 'Hadir',
        optedOut: 'Batal Ikut',
        noShow: 'Tidak Hadir',
        unposted: 'Belum Dipasang',
    },
    roles: {
        ADMIN: 'Admin',
        MEMBER: 'Anggota',
        OWNER: 'Owner',
    },
    table: {
        pagination: {
            previous: 'Sebelumnya',
            next: 'Berikutnya',
            pageOf: 'Halaman {page} dari {total}',
            perPage: 'Per halaman',
            showAll: 'Tampilkan semua',
            total: '{n} hasil',
        },
        sort: {
            asc: 'Urutan naik',
            desc: 'Urutan turun',
        },
        search: {
            placeholder: 'Cari...',
            btn: 'Cari',
            memberPlaceholder: 'Cari nama atau email...',
            titlePlaceholder: 'Cari berdasarkan judul...',
            activityPlaceholder: 'Cari berdasarkan nama atau slug...',
        },
        filter: {
            allStatuses: 'Semua Status',
            allActivities: 'Semua Aktivitas',
        },
    },
    validation: {
        nameMin: 'Nama minimal 2 karakter',
        nameMax: 'Nama maksimal 100 karakter',
        phoneMin: 'Nomor HP tidak valid',
        phoneMax: 'Nomor HP tidak valid',
        phoneFormat: 'Nomor HP hanya boleh berisi angka',
        sessionTitleMin: 'Judul minimal 3 karakter',
        sessionTitleMax: 'Judul maksimal 200 karakter',
        sessionDateRequired: 'Tanggal wajib diisi',
        sessionTimeFormat: 'Format waktu tidak valid (HH:MM)',
        sessionEndAfterStart: 'Waktu selesai harus setelah waktu mulai',
        communityNameRequired: 'Nama komunitas wajib diisi',
        sessionLocationMin: 'Lokasi minimal 3 karakter',
        sessionLocationMax: 'Lokasi maksimal 200 karakter',
        sessionMaxPlayersMin: 'Minimal 2 pemain',
        sessionMaxPlayersMax: 'Maksimal 100 pemain',
        sessionFeeMin: 'Biaya tidak boleh negatif',
        feeRequired: 'Biaya wajib diisi',
        maxPlayersRequired: 'Maks peserta wajib diisi',
        minMembersMin: 'Minimal anggota tidak boleh negatif',
        minMembersMax: 'Minimal anggota terlalu besar',
        minMembersRequired: 'Minimal anggota wajib diisi (0 = tanpa minimum)',
        paymentModeAtLeastOne: 'Aktifkan minimal satu metode pembayaran',
        paymentModeRequired: 'Pilih metode pembayaran',
        paymentModeNotOffered: 'Aktivitas ini tidak menawarkan metode tersebut',
        userIdRequired: 'User ID wajib diisi',
        paymentAmountMin: 'Jumlah pembayaran harus lebih dari 0',
        fileRequired: 'File wajib diupload',
        fileTypeInvalid:
            'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.',
        fileSizeAvatar: 'Ukuran file maksimal 2MB.',
        fileSizeProof: 'Ukuran file maksimal 5MB.',
        monthYearInvalid: 'Bulan/tahun tidak valid',
        amountInvalid: 'Jumlah pembayaran tidak valid',
        nameInvalid: 'Nama tidak valid',
        activityNameMin: 'Nama minimal 2 karakter',
        activityNameMax: 'Nama maksimal 100 karakter',
        activitySlugRequired: 'Slug wajib diisi',
        activitySlugFormat:
            'Slug hanya boleh huruf kecil, angka, dan tanda hubung',
        activitySlugTaken: 'Slug tersebut sudah digunakan',
        bankAccountNumberFormat: 'Nomor rekening hanya boleh berisi angka',
        activityRequired: 'Pilih aktivitas',
        activityMembershipRequired: 'Pilih minimal satu aktivitas',
        rejectReasonRequired: 'Alasan penolakan wajib diisi.',
    },
};

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, id };

export function getDictionary(locale: Locale): Dictionary {
    return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
