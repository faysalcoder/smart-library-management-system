<?php

use App\Exceptions\DomainException as SlmsDomainException;
use App\Http\Middleware\EnsureUserHasPermission;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(append: [
            ForceJsonResponse::class,
        ]);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'perm' => EnsureUserHasPermission::class,
        ]);

        // Trust the platform's edge proxy (Railway / any single-hop PaaS
        // load balancer sits in front of every request in production). Without
        // this, $request->ip() returns the proxy's IP for every request, which
        // silently breaks the per-IP login rate limiter (AppServiceProvider)
        // and the IP address recorded in the audit log (AuditLogService) —
        // every request would look like it came from one client.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        /**
         * Every API error is returned in the same envelope as every success:
         *   { ok, data, message, errors }
         * This keeps the React client's error handling uniform.
         */
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            [$status, $message, $errors] = match (true) {
                $e instanceof ValidationException => [
                    422,
                    'The submitted data is invalid.',
                    $e->errors(),
                ],
                $e instanceof AuthenticationException => [
                    401,
                    'You are not signed in. Please sign in and try again.',
                    [],
                ],
                $e instanceof AuthorizationException => [
                    403,
                    $e->getMessage() ?: 'You do not have permission to perform this action.',
                    [],
                ],
                $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => [
                    404,
                    'The requested record was not found.',
                    [],
                ],
                $e instanceof TooManyRequestsHttpException => [
                    429,
                    'Too many attempts. Please wait a moment and try again.',
                    [],
                ],
                // Business-rule violations (BR-01 … BR-15) surface as 409 Conflict
                // so the client can distinguish them from validation errors.
                $e instanceof SlmsDomainException => [
                    $e->getStatus(),
                    $e->getMessage(),
                    $e->getContext(),
                ],
                $e instanceof HttpExceptionInterface => [
                    $e->getStatusCode(),
                    $e->getMessage() ?: 'Request failed.',
                    [],
                ],
                default => [
                    500,
                    config('app.debug') ? $e->getMessage() : 'An unexpected server error occurred.',
                    [],
                ],
            };

            $payload = [
                'ok' => false,
                'data' => null,
                'message' => $message,
                'errors' => (object) $errors,
            ];

            if (config('app.debug') && $status === 500) {
                $payload['debug'] = [
                    'exception' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ];
            }

            return response()->json($payload, $status);
        });
    })
    ->create();
