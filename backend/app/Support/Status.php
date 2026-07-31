<?php

namespace App\Support;

/**
 * Status vocabularies.
 *
 * Statuses are stored as strings rather than MySQL ENUMs so that adding a value
 * never requires an ALTER TABLE on a live circulation table. Validity is
 * enforced here and in the Form Requests.
 */
final class Status
{
    // ---- Book copy -------------------------------------------------------
    public const COPY_AVAILABLE = 'available';
    public const COPY_ISSUED = 'issued';
    public const COPY_RESERVED = 'reserved';
    public const COPY_LOST = 'lost';
    public const COPY_DAMAGED = 'damaged';
    public const COPY_WITHDRAWN = 'withdrawn';

    public const COPY_ALL = [
        self::COPY_AVAILABLE, self::COPY_ISSUED, self::COPY_RESERVED,
        self::COPY_LOST, self::COPY_DAMAGED, self::COPY_WITHDRAWN,
    ];

    /** Copies in these states still count as library holdings. */
    public const COPY_ACTIVE = [
        self::COPY_AVAILABLE, self::COPY_ISSUED, self::COPY_RESERVED, self::COPY_DAMAGED,
    ];

    // ---- Circulation -----------------------------------------------------
    public const CIRC_ISSUED = 'issued';
    public const CIRC_RETURNED = 'returned';
    public const CIRC_OVERDUE = 'overdue';
    public const CIRC_LOST = 'lost';

    public const CIRC_ALL = [self::CIRC_ISSUED, self::CIRC_RETURNED, self::CIRC_OVERDUE, self::CIRC_LOST];

    /** A loan that is still out with the borrower. */
    public const CIRC_OPEN = [self::CIRC_ISSUED, self::CIRC_OVERDUE];

    // ---- Fine ------------------------------------------------------------
    public const FINE_PENDING = 'pending';
    public const FINE_PARTIAL = 'partial';
    public const FINE_PAID = 'paid';
    public const FINE_WAIVED = 'waived';

    public const FINE_ALL = [self::FINE_PENDING, self::FINE_PARTIAL, self::FINE_PAID, self::FINE_WAIVED];

    /** Fines that still contribute to a student's outstanding balance. */
    public const FINE_OUTSTANDING = [self::FINE_PENDING, self::FINE_PARTIAL];

    // ---- Membership ------------------------------------------------------
    public const MEMBER_ACTIVE = 'active';
    public const MEMBER_SUSPENDED = 'suspended';
    public const MEMBER_EXPIRED = 'expired';

    public const MEMBER_ALL = [self::MEMBER_ACTIVE, self::MEMBER_SUSPENDED, self::MEMBER_EXPIRED];

    // ---- Borrow eligibility ---------------------------------------------
    public const BORROW_ELIGIBLE = 'eligible';
    public const BORROW_BLOCKED = 'blocked';

    // ---- User account ----------------------------------------------------
    public const USER_ACTIVE = 'active';
    public const USER_INACTIVE = 'inactive';
    public const USER_LOCKED = 'locked';

    public const USER_ALL = [self::USER_ACTIVE, self::USER_INACTIVE, self::USER_LOCKED];

    // ---- Condition -------------------------------------------------------
    public const CONDITION_ALL = ['new', 'good', 'fair', 'poor'];
}
