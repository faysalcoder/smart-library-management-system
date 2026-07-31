<?php

namespace App\Services\System;

use App\Exceptions\DomainException;
use App\Models\Role;
use App\Models\User;
use App\Support\AuditAction;
use App\Support\Roles;
use App\Support\Status;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * FR-09 — User account management.
 */
class UserAccountService
{
    public function __construct(private AuditLogService $audit) {}

    public function create(array $data, User $actor): User
    {
        $user = User::create([
            'username' => $data['username'],
            'email' => $data['email'],
            'full_name' => $data['full_name'],
            'password' => Hash::make($data['password']),
            'role_id' => $data['role_id'],
            'status' => $data['status'] ?? Status::USER_ACTIVE,
            'must_change_password' => $data['must_change_password'] ?? true,
        ]);

        $this->audit->record(
            $actor,
            AuditAction::USER_CREATED,
            'user',
            $user->user_id,
            sprintf('Created account "%s" with role "%s"', $user->username, $user->role->name)
        );

        return $user->fresh('role');
    }

    public function update(User $user, array $data, User $actor): User
    {
        $roleChanged = isset($data['role_id']) && (int) $data['role_id'] !== (int) $user->role_id;

        // BR-13 — the last active administrator must remain an administrator.
        if ($roleChanged && $this->isLastActiveAdmin($user)) {
            throw new DomainException(
                'This is the last active administrator account. Promote another user before changing this role.'
            );
        }

        $user->update(collect($data)->only([
            'username', 'email', 'full_name', 'role_id', 'status', 'avatar_url',
        ])->all());

        $this->audit->record(
            $actor,
            $roleChanged ? AuditAction::ROLE_CHANGED : AuditAction::USER_UPDATED,
            'user',
            $user->user_id,
            sprintf('Updated account "%s"', $user->username)
        );

        return $user->fresh('role');
    }

    public function setStatus(User $user, string $status, User $actor): User
    {
        if (! in_array($status, Status::USER_ALL, true)) {
            throw new DomainException('Invalid account status.', [], 422);
        }

        // BR-13 — cannot disable or lock the last active administrator.
        if ($status !== Status::USER_ACTIVE && $this->isLastActiveAdmin($user)) {
            throw new DomainException(
                'This is the last active administrator account and cannot be disabled.'
            );
        }

        if ($user->user_id === $actor->user_id && $status !== Status::USER_ACTIVE) {
            throw new DomainException('You cannot disable your own account.');
        }

        $user->forceFill([
            'status' => $status,
            'failed_attempts' => 0,
            'locked_until' => null,
        ])->save();

        // Disabling an account immediately kills its sessions.
        if ($status !== Status::USER_ACTIVE) {
            $user->tokens()->delete();
        }

        $this->audit->record(
            $actor,
            AuditAction::USER_DISABLED,
            'user',
            $user->user_id,
            sprintf('Account "%s" set to "%s"', $user->username, $status)
        );

        return $user->fresh('role');
    }

    /** Generates a temporary password and forces a change at next sign-in. */
    public function resetPassword(User $user, User $actor): string
    {
        $temporary = Str::upper(Str::random(4)).'-'.Str::random(6);

        $user->forceFill([
            'password' => Hash::make($temporary),
            'must_change_password' => true,
            'failed_attempts' => 0,
            'locked_until' => null,
            'status' => $user->status === Status::USER_LOCKED ? Status::USER_ACTIVE : $user->status,
        ])->save();

        $user->tokens()->delete();

        $this->audit->record(
            $actor,
            AuditAction::PASSWORD_RESET,
            'user',
            $user->user_id,
            sprintf('Password reset for "%s"', $user->username)
        );

        return $temporary;
    }

    public function delete(User $user, User $actor): void
    {
        if ($user->user_id === $actor->user_id) {
            throw new DomainException('You cannot delete your own account.');
        }

        if ($this->isLastActiveAdmin($user)) {
            throw new DomainException('The last active administrator account cannot be deleted.');
        }

        if ($user->student()->exists()) {
            throw new DomainException(
                'This account is linked to a student record. Remove the link before deleting.'
            );
        }

        $username = $user->username;
        $id = $user->user_id;

        $user->tokens()->delete();
        $user->delete();

        $this->audit->record($actor, AuditAction::USER_DISABLED, 'user', $id, "Deleted account \"{$username}\"");
    }

    private function isLastActiveAdmin(User $user): bool
    {
        if (! $user->hasRole(Roles::ADMIN)) {
            return false;
        }

        $adminRoleId = Role::where('name', Roles::ADMIN)->value('role_id');

        $otherActiveAdmins = User::where('role_id', $adminRoleId)
            ->where('status', Status::USER_ACTIVE)
            ->where('user_id', '!=', $user->user_id)
            ->count();

        return $otherActiveAdmins === 0;
    }
}
