<?php

namespace App\Support;

final class Roles
{
    public const STUDENT = 'student';
    public const LIBRARIAN = 'librarian';
    public const ADMIN = 'admin';
    public const MANAGEMENT = 'management';

    public const ALL = [self::STUDENT, self::LIBRARIAN, self::ADMIN, self::MANAGEMENT];

    /** Roles that operate the circulation desk. */
    public const STAFF = [self::LIBRARIAN, self::ADMIN];
}
