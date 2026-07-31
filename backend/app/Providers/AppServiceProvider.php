<?php

namespace App\Providers;

use App\Services\System\SettingService;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SettingService::class);
    }

    public function boot(): void
    {
        // Sign-in throttle — 5 attempts per minute per username+IP pair.
        RateLimiter::for('login', function (Request $request) {
            $key = strtolower((string) $request->input('username')).'|'.$request->ip();

            return Limit::perMinute(5)->by($key);
        });

        // General API throttle.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->user_id ?: $request->ip());
        });

        // Scanner endpoints are hit rapidly at the desk — allow more headroom.
        RateLimiter::for('scanner', function (Request $request) {
            return Limit::perMinute(300)->by($request->user()?->user_id ?: $request->ip());
        });
    }
}
