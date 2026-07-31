<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\System\UserAccountService;
use App\Support\Status;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * FR-09 — User account management (Administrator only).
 */
class UserController extends Controller
{
    public function __construct(private UserAccountService $accounts) {}

    /** GET /api/admin/users */
    public function index(Request $request): JsonResponse
    {
        $page = User::with('role')
            ->when($request->query('q'), fn ($q, $term) => $q->where(function ($sub) use ($term) {
                $sub->where('full_name', 'like', "%{$term}%")
                    ->orWhere('username', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%");
            }))
            ->when($request->query('role_id'), fn ($q, $id) => $q->where('role_id', $id))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderBy('full_name')
            ->paginate(min(100, (int) $request->query('per_page', 25)));

        return $this->paginated($page, UserResource::collection($page->getCollection())->resolve());
    }

    /** GET /api/admin/users/{user} */
    public function show(User $user): JsonResponse
    {
        return $this->ok(new UserResource($user->load('role.permissions')));
    }

    /** POST /api/admin/users */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:50', 'unique:users,username'],
            'email' => ['required', 'email', 'max:120', 'unique:users,email'],
            'full_name' => ['required', 'string', 'max:120'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'role_id' => ['required', 'exists:roles,role_id'],
            'status' => ['nullable', Rule::in(Status::USER_ALL)],
            'must_change_password' => ['nullable', 'boolean'],
        ]);

        $user = $this->accounts->create($data, $request->user());

        return $this->created(new UserResource($user), 'Account created.');
    }

    /** PUT /api/admin/users/{user} */
    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'username' => ['sometimes', 'string', 'max:50', Rule::unique('users', 'username')->ignore($user->user_id, 'user_id')],
            'email' => ['sometimes', 'email', 'max:120', Rule::unique('users', 'email')->ignore($user->user_id, 'user_id')],
            'full_name' => ['sometimes', 'string', 'max:120'],
            'role_id' => ['sometimes', 'exists:roles,role_id'],
            'status' => ['sometimes', Rule::in(Status::USER_ALL)],
            'avatar_url' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $this->accounts->update($user, $data, $request->user());

        return $this->ok(new UserResource($user), 'Account updated.');
    }

    /** PATCH /api/admin/users/{user}/status — BR-13 */
    public function setStatus(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Status::USER_ALL)],
        ]);

        $user = $this->accounts->setStatus($user, $data['status'], $request->user());

        return $this->ok(new UserResource($user), 'Account status updated.');
    }

    /** POST /api/admin/users/{user}/reset-password */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $temporary = $this->accounts->resetPassword($user, $request->user());

        return $this->ok(
            ['temporary_password' => $temporary],
            'Password reset. Share the temporary password with the user — they must change it at next sign-in.'
        );
    }

    /** DELETE /api/admin/users/{user} */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->accounts->delete($user, $request->user());

        return $this->ok(null, 'Account deleted.');
    }

    /** GET /api/admin/roles — role + permission matrix (S-18) */
    public function roles(): JsonResponse
    {
        $roles = Role::with('permissions')
            ->withCount('users')
            ->orderBy('role_id')
            ->get()
            ->map(fn (Role $r) => [
                'role_id' => $r->role_id,
                'name' => $r->name,
                'description' => $r->description,
                'users_count' => $r->users_count,
                'permissions' => $r->permissions->pluck('code'),
            ]);

        return $this->ok($roles);
    }
}
