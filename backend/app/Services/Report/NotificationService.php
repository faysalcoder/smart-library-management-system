<?php

namespace App\Services\Report;

use App\Models\Circulation;
use App\Models\Fine;
use App\Models\User;
use App\Services\System\SettingService;
use App\Support\Roles;

/**
 * §3.3 Context Diagram — students "receive borrowing confirmations, book
 * availability information, and fine notifications"; librarians "receive
 * circulation reports".
 *
 * Notifications are DERIVED from live state rather than stored, so they can
 * never go stale: return the book and the notification disappears on the next
 * poll. Each item carries a link so it is actionable, not just informational.
 */
class NotificationService
{
    public function __construct(private SettingService $settings) {}

    /**
     * @return array{items: array<int,array<string,mixed>>, count: int, urgent: int}
     */
    public function forUser(User $user): array
    {
        $items = $user->hasRole(Roles::STUDENT)
            ? $this->forStudent($user)
            : $this->forStaff($user);

        return [
            'items' => $items,
            'count' => count($items),
            'urgent' => count(array_filter($items, fn ($i) => $i['tone'] === 'danger')),
        ];
    }

    /** @return array<int,array<string,mixed>> */
    private function forStudent(User $user): array
    {
        $student = $user->student;

        if (! $student) {
            return [];
        }

        $items = [];

        $loans = Circulation::with('copy.book.author')
            ->where('student_id', $student->student_id)
            ->open()
            ->orderBy('due_date')
            ->get();

        // --- Overdue books -------------------------------------------------
        $overdue = $loans->filter(fn (Circulation $c) => $c->is_overdue);

        foreach ($overdue as $loan) {
            $items[] = [
                'id' => 'overdue-'.$loan->circulation_id,
                'tone' => 'danger',
                'icon' => 'warning',
                'title' => sprintf('%d day(s) overdue', $loan->overdue_days),
                'message' => sprintf(
                    '"%s" was due on %s. Return it to stop the fine increasing.',
                    $loan->copy->book->title,
                    $loan->due_date->format('d M Y')
                ),
                'link' => '/my/loans',
            ];
        }

        // --- Due soon ------------------------------------------------------
        $dueSoon = $loans->filter(
            fn (Circulation $c) => ! $c->is_overdue && $c->due_date->diffInDays(now()) <= 2
        );

        foreach ($dueSoon as $loan) {
            $items[] = [
                'id' => 'duesoon-'.$loan->circulation_id,
                'tone' => 'warning',
                'icon' => 'schedule',
                'title' => $loan->due_date->isToday() ? 'Due back today' : 'Due back soon',
                'message' => sprintf(
                    '"%s" is due on %s.',
                    $loan->copy->book->title,
                    $loan->due_date->format('d M Y')
                ),
                'link' => '/my/loans',
            ];
        }

        // --- Fine notifications --------------------------------------------
        $outstanding = (float) $student->outstanding_fine;

        if ($outstanding > 0) {
            $threshold = $this->settings->decimal('fine_block_threshold', 100.00);
            $blocked = $outstanding > $threshold;
            $symbol = config('library.currency.symbol');

            $items[] = [
                'id' => 'fine-balance',
                'tone' => $blocked ? 'danger' : 'warning',
                'icon' => 'payments',
                'title' => $blocked ? 'Borrowing is blocked' : 'You have an unpaid fine',
                'message' => $blocked
                    ? sprintf(
                        'Your outstanding fine of %s%.2f exceeds the %s%.2f limit. Settle it at the desk to borrow again.',
                        $symbol, $outstanding, $symbol, $threshold
                    )
                    : sprintf('You owe %s%.2f. Pay at the circulation desk.', $symbol, $outstanding),
                'link' => '/my/fines',
            ];
        }

        return $items;
    }

    /** @return array<int,array<string,mixed>> */
    private function forStaff(User $user): array
    {
        $items = [];

        $overdueCount = Circulation::overdue()->count();

        if ($overdueCount > 0) {
            $severe = Circulation::overdue()
                ->whereDate('due_date', '<', now()->subDays(30)->toDateString())
                ->count();

            $items[] = [
                'id' => 'overdue-total',
                'tone' => $severe > 0 ? 'danger' : 'warning',
                'icon' => 'warning',
                'title' => sprintf('%d overdue loan(s)', $overdueCount),
                'message' => $severe > 0
                    ? sprintf('%d of them are more than 30 days overdue.', $severe)
                    : 'Review the overdue monitor and contact the borrowers.',
                'link' => '/circulation/overdue',
            ];
        }

        $pendingFines = Fine::outstanding()->count();

        if ($pendingFines > 0) {
            $items[] = [
                'id' => 'fines-pending',
                'tone' => 'warning',
                'icon' => 'payments',
                'title' => sprintf('%d unsettled fine(s)', $pendingFines),
                'message' => 'Collect payment at the circulation desk.',
                'link' => '/fines',
            ];
        }

        $dueToday = Circulation::open()
            ->whereDate('due_date', now()->toDateString())
            ->count();

        if ($dueToday > 0) {
            $items[] = [
                'id' => 'due-today',
                'tone' => 'info',
                'icon' => 'today',
                'title' => sprintf('%d book(s) due back today', $dueToday),
                'message' => 'Expect these returns at the desk.',
                'link' => '/circulation',
            ];
        }

        return $items;
    }
}
