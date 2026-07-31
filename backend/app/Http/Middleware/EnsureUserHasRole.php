<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route guard: role:admin  |  role:librarian,admin
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            throw new AuthorizationException('Authentication required.');
        }

        if (! $user->isActive()) {
            throw new AuthorizationException('This account is not active.');
        }

        if (! $user->hasRole(...$roles)) {
            throw new AuthorizationException(
                'Your role does not have access to this area.'
            );
        }

        return $next($request);
    }
}
