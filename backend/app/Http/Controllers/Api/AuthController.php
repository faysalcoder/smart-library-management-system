<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthenticationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthenticationService $auth) {}

    /** POST /api/auth/login — FR-01 */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login(
            $request->validated('username'),
            $request->validated('password'),
        );

        return $this->ok([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
        ], 'Signed in successfully.');
    }

    /** POST /api/auth/register — public student self-registration. */
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->auth->register($request->validated());

        return $this->created([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
        ], 'Account created. Welcome to the library!');
    }

    /** POST /api/auth/logout */
    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user());

        return $this->ok(null, 'Signed out.');
    }

    /** GET /api/auth/me — rehydrates the client after a page refresh. */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role.permissions', 'student']);

        return $this->ok(new UserResource($user));
    }

    /** POST /api/auth/change-password */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->auth->changePassword(
            $request->user(),
            $request->validated('current_password'),
            $request->validated('password'),
        );

        return $this->ok(null, 'Password changed. Please sign in again.');
    }
}
