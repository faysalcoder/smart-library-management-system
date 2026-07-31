<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route guard: perm:circulate  |  perm:fine.collect
 *
 * Deny by default — a missing permission is a denial, never a pass-through.
 */
class EnsureUserHasPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            throw new AuthorizationException('Authentication required.');
        }

        if (! $user->isActive()) {
            throw new AuthorizationException('This account is not active.');
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        throw new AuthorizationException(
            'You do not have permission to perform this action.'
        );
    }
}
