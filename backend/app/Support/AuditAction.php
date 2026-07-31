<?php

namespace App\Support;

final class AuditAction
{
    public const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
    public const LOGIN_FAILED = 'LOGIN_FAILED';
    public const LOGOUT = 'LOGOUT';
    public const PASSWORD_CHANGED = 'PASSWORD_CHANGED';
    public const ACCOUNT_LOCKED = 'ACCOUNT_LOCKED';

    public const USER_CREATED = 'USER_CREATED';
    public const USER_UPDATED = 'USER_UPDATED';
    public const USER_DISABLED = 'USER_DISABLED';
    public const PASSWORD_RESET = 'PASSWORD_RESET';
    public const ROLE_CHANGED = 'ROLE_CHANGED';

    public const BOOK_CREATED = 'BOOK_CREATED';
    public const BOOK_UPDATED = 'BOOK_UPDATED';
    public const BOOK_DELETED = 'BOOK_DELETED';
    public const COPY_ADDED = 'COPY_ADDED';
    public const COPY_UPDATED = 'COPY_UPDATED';
    public const COPY_WITHDRAWN = 'COPY_WITHDRAWN';
    public const CATEGORY_CREATED = 'CATEGORY_CREATED';
    public const CATEGORY_UPDATED = 'CATEGORY_UPDATED';
    public const CATEGORY_DELETED = 'CATEGORY_DELETED';

    public const AUTHOR_CREATED = 'AUTHOR_CREATED';
    public const AUTHOR_UPDATED = 'AUTHOR_UPDATED';
    public const AUTHOR_DELETED = 'AUTHOR_DELETED';

    public const PUBLISHER_CREATED = 'PUBLISHER_CREATED';
    public const PUBLISHER_UPDATED = 'PUBLISHER_UPDATED';
    public const PUBLISHER_DELETED = 'PUBLISHER_DELETED';

    public const STUDENT_CREATED = 'STUDENT_CREATED';
    public const STUDENT_UPDATED = 'STUDENT_UPDATED';
    public const STUDENT_DELETED = 'STUDENT_DELETED';
    public const STUDENT_SUSPENDED = 'STUDENT_SUSPENDED';
    public const CARD_VERIFIED = 'CARD_VERIFIED';
    public const CARD_VERIFY_FAILED = 'CARD_VERIFY_FAILED';

    public const BOOK_ISSUED = 'BOOK_ISSUED';
    public const BOOK_RETURNED = 'BOOK_RETURNED';
    public const LOAN_RENEWED = 'LOAN_RENEWED';

    public const FINE_CREATED = 'FINE_CREATED';
    public const FINE_COLLECTED = 'FINE_COLLECTED';
    public const FINE_WAIVED = 'FINE_WAIVED';

    public const SETTING_UPDATED = 'SETTING_UPDATED';
    public const REPORT_EXPORTED = 'REPORT_EXPORTED';

    public const BACKUP_CREATED = 'BACKUP_CREATED';
    public const BACKUP_RESTORED = 'BACKUP_RESTORED';
    public const BACKUP_DELETED = 'BACKUP_DELETED';
}
