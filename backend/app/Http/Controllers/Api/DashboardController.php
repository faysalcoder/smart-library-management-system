<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Report\DashboardService;
use App\Services\Report\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private DashboardService $dashboard,
        private NotificationService $notifications,
    ) {}

    /** GET /api/dashboard — role-dispatched */
    public function index(Request $request): JsonResponse
    {
        return $this->ok($this->dashboard->forUser($request->user()));
    }

    /**
     * GET /api/notifications — §3.3 fine / due-date notifications.
     *
     * Derived from live state, so an item disappears as soon as the underlying
     * condition is resolved.
     */
    public function notifications(Request $request): JsonResponse
    {
        return $this->ok($this->notifications->forUser($request->user()));
    }
}
