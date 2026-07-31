<?php

namespace App\Services\Auth;

use App\Exceptions\DomainException;
use App\Models\Role;
use App\Models\User;
use App\Services\Member\StudentService;
use App\Services\System\AuditLogService;
use App\Services\System\SettingService;
use App\Support\AuditAction;
use App\Support\Roles;
use App\Support\Status;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthenticationService
{
    public function __construct(
        private AuditLogService $audit,
        private SettingService $settings,
        private StudentService $students,
    ) {}

    /**
     * Public self-registration for students. Creates the login account and
     * the linked member profile together, then signs the student straight in
     * — matching login()'s return shape so the client handles both the same
     * way.
     *
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $user = DB::transaction(function () use ($data) {
            $studentRoleId = Role::where('name', Roles::STUDENT)->value('role_id');

            $user = User::create([
                'username' => $this->uniqueUsernameFromEmail($data['email']),
                'email' => $data['email'],
                'full_name' => $data['full_name'],
                'password' => Hash::make($data['password']),
                'role_id' => $studentRoleId,
                'status' => Status::USER_ACTIVE,
                'must_change_password' => false,
            ]);

            $this->students->registerSelf($user, $data);

            return $user;
        });

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken('slms-web', ['*'])->plainTextToken;

        $this->audit->record($user, AuditAction::LOGIN_SUCCESS, 'user', $user->user_id, 'Signed in after registration');

        return ['user' => $user->fresh(['role.permissions', 'student']), 'token' => $token];
    }

    /** Derives a unique login username from an email's local part. */
    private function uniqueUsernameFromEmail(string $email): string
    {
        $base = Str::slug(Str::before($email, '@'), '.');
        $base = $base !== '' ? $base : 'student';
        $candidate = $base;
        $suffix = 1;

        while (User::where('username', $candidate)->exists()) {
            $suffix++;
            $candidate = "{$base}{$suffix}";
        }

        return $candidate;
    }

    /**
     * FR-01 — authenticate and issue a Sanctum access token.
     *
     * @return array{user: User, token: string}
     */
    public function login(string $identifier, string $password): array
    {
        $user = User::with('role.permissions')
            ->where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (! $user) {
            $this->audit->recordAnonymous(
                AuditAction::LOGIN_FAILED,
                "Unknown account '{$identifier}'"
            );

            throw new DomainException('Incorrect username or password.', [], 401);
        }

        if ($user->isLocked()) {
            $this->audit->record($user, AuditAction::LOGIN_FAILED, 'user', $user->user_id, 'Attempt on a locked account');

            throw new DomainException(
                'This account is locked. Please contact the library administrator.',
                [],
                423
            );
        }

        if ($user->status === Status::USER_INACTIVE) {
            throw new DomainException('This account has been deactivated.', [], 403);
        }

        if (! Hash::check($password, $user->password)) {
            $this->registerFailedAttempt($user);

            $remaining = max(0, $this->settings->int('max_failed_logins', 5) - $user->failed_attempts);

            throw new DomainException(
                $remaining > 0
                    ? "Incorrect username or password. {$remaining} attempt(s) remaining before the account is locked."
                    : 'Incorrect username or password. This account is now locked.',
                ['attempts_remaining' => $remaining],
                401
            );
        }

        // Successful login clears the failure counter.
        $user->forceFill([
            'failed_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
        ])->save();

        $token = $user->createToken('slms-web', ['*'])->plainTextToken;

        $this->audit->record($user, AuditAction::LOGIN_SUCCESS, 'user', $user->user_id, 'Signed in');

        return ['user' => $user->fresh('role.permissions', 'student'), 'token' => $token];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();

        $this->audit->record($user, AuditAction::LOGOUT, 'user', $user->user_id, 'Signed out');
    }

    public function changePassword(User $user, string $current, string $new): void
    {
        if (! Hash::check($current, $user->password)) {
            throw new DomainException('Your current password is incorrect.', [], 422);
        }

        if (Hash::check($new, $user->password)) {
            throw new DomainException('The new password must be different from the current one.', [], 422);
        }

        $user->forceFill([
            'password' => Hash::make($new),
            'must_change_password' => false,
        ])->save();

        // Invalidate every other session for this account.
        $user->tokens()->delete();

        $this->audit->record($user, AuditAction::PASSWORD_CHANGED, 'user', $user->user_id, 'Password changed');
    }

    private function registerFailedAttempt(User $user): void
    {
        $max = $this->settings->int('max_failed_logins', 5);

        $user->increment('failed_attempts');
        $user->refresh();

        if ($user->failed_attempts >= $max) {
            $user->forceFill([
                'status' => Status::USER_LOCKED,
                'locked_until' => now()->addMinutes(30),
            ])->save();

            $this->audit->record(
                $user,
                AuditAction::ACCOUNT_LOCKED,
                'user',
                $user->user_id,
                "Locked after {$user->failed_attempts} failed sign-in attempts"
            );

            return;
        }

        $this->audit->record(
            $user,
            AuditAction::LOGIN_FAILED,
            'user',
            $user->user_id,
            "Failed sign-in attempt {$user->failed_attempts} of {$max}"
        );
    }
}
