<?php

namespace App\Support;

/**
 * Granular capabilities. Mirrors the RBAC matrix in
 * SYSTEM_ARCHITECTURE.md §12.1.
 */
final class Permissions
{
    public const BOOK_SEARCH = 'book.search';
    public const BOOK_VIEW = 'book.view';
    public const BOOK_MANAGE = 'book.manage';
    public const COPY_MANAGE = 'copy.manage';
    public const CATEGORY_MANAGE = 'category.manage';
    public const AUTHOR_MANAGE = 'author.manage';
    public const PUBLISHER_MANAGE = 'publisher.manage';

    public const STUDENT_VIEW = 'student.view';
    public const STUDENT_MANAGE = 'student.manage';

    public const CIRCULATE = 'circulate';
    public const LOAN_VIEW = 'loan.view';

    public const FINE_VIEW = 'fine.view';
    public const FINE_COLLECT = 'fine.collect';
    public const FINE_WAIVE = 'fine.waive';

    public const REPORT_VIEW = 'report.view';
    public const REPORT_EXPORT = 'report.export';

    public const USER_MANAGE = 'user.manage';
    public const ROLE_MANAGE = 'role.manage';
    public const SETTING_MANAGE = 'setting.manage';
    public const LOG_VIEW = 'log.view';
    public const BACKUP_MANAGE = 'backup.manage';

    /** code => human description */
    public const CATALOGUE = [
        self::BOOK_SEARCH => 'Search the book catalog',
        self::BOOK_VIEW => 'View book details',
        self::BOOK_MANAGE => 'Create, edit and delete books',
        self::COPY_MANAGE => 'Manage physical book copies',
        self::CATEGORY_MANAGE => 'Manage book categories',
        self::AUTHOR_MANAGE => 'Manage authors',
        self::PUBLISHER_MANAGE => 'Manage publishers',
        self::STUDENT_VIEW => 'View student records',
        self::STUDENT_MANAGE => 'Create, edit and delete student records',
        self::CIRCULATE => 'Issue and return books',
        self::LOAN_VIEW => 'View loan records',
        self::FINE_VIEW => 'View fines',
        self::FINE_COLLECT => 'Collect fine payments',
        self::FINE_WAIVE => 'Waive fines',
        self::REPORT_VIEW => 'View reports',
        self::REPORT_EXPORT => 'Export reports',
        self::USER_MANAGE => 'Manage user accounts',
        self::ROLE_MANAGE => 'Manage roles and permissions',
        self::SETTING_MANAGE => 'Change system settings',
        self::LOG_VIEW => 'View the audit log',
        self::BACKUP_MANAGE => 'Create and restore backups',
    ];

    /** role => permission codes */
    public const BY_ROLE = [
        Roles::STUDENT => [
            self::BOOK_SEARCH, self::BOOK_VIEW,
        ],
        Roles::LIBRARIAN => [
            self::BOOK_SEARCH, self::BOOK_VIEW, self::BOOK_MANAGE, self::COPY_MANAGE,
            self::CATEGORY_MANAGE, self::AUTHOR_MANAGE, self::PUBLISHER_MANAGE,
            self::STUDENT_VIEW, self::STUDENT_MANAGE,
            self::CIRCULATE, self::LOAN_VIEW,
            self::FINE_VIEW, self::FINE_COLLECT,
            self::REPORT_VIEW, self::REPORT_EXPORT,
        ],
        Roles::ADMIN => [
            self::BOOK_SEARCH, self::BOOK_VIEW, self::BOOK_MANAGE, self::COPY_MANAGE,
            self::CATEGORY_MANAGE, self::AUTHOR_MANAGE, self::PUBLISHER_MANAGE,
            self::STUDENT_VIEW, self::STUDENT_MANAGE,
            self::CIRCULATE, self::LOAN_VIEW,
            self::FINE_VIEW, self::FINE_COLLECT, self::FINE_WAIVE,
            self::REPORT_VIEW, self::REPORT_EXPORT,
            self::USER_MANAGE, self::ROLE_MANAGE, self::SETTING_MANAGE, self::LOG_VIEW, self::BACKUP_MANAGE,
        ],
        Roles::MANAGEMENT => [
            self::BOOK_SEARCH, self::BOOK_VIEW,
            self::FINE_VIEW,
            self::REPORT_VIEW, self::REPORT_EXPORT,
        ],
    ];
}
