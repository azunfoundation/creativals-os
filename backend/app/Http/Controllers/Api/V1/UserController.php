<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->nonPortal()
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->department_id, fn($q, $v) =>
                $q->whereHas('departments', fn($dq) => $dq->where('departments.id', $v))
            )
            ->when($request->role, fn($q, $v) => $q->role($v))
            ->when($request->search, fn($q, $v) =>
                $q->where(fn($sq) =>
                    $sq->where('name', 'like', "%{$v}%")
                       ->orWhere('email', 'like', "%{$v}%")
                       ->orWhere('employee_id', 'like', "%{$v}%")
                )
            )
            ->with(['roles', 'departments'])
            ->orderBy('name')
            ->paginate($request->per_page ?? 25);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name'                   => ['required', 'string', 'max:255'],
            'email'                  => ['required', 'email', 'unique:users'],
            'password'               => ['required', 'string', 'min:8'],
            'phone'                  => ['nullable', 'string', 'max:20'],
            'employee_id'            => ['nullable', 'string', 'unique:users,employee_id'],
            'status'                 => ['nullable', Rule::in(['active', 'inactive'])],
            'role_ids'               => ['nullable', 'array'],
            'role_ids.*'             => ['exists:roles,id'],
            'department_ids'         => ['nullable', 'array'],
            'department_ids.*'       => ['exists:departments,id'],
            'manager_ids'            => ['nullable', 'array'],
            'manager_ids.*'          => ['exists:users,id'],
        ]);

        $user = User::create([
            'name'        => $validated['name'],
            'email'       => $validated['email'],
            'password'    => Hash::make($validated['password']),
            'phone'       => $validated['phone'] ?? null,
            'employee_id' => $validated['employee_id'] ?? null,
            'status'      => $validated['status'] ?? 'active',
        ]);

        if (! empty($validated['role_ids'])) {
            $roles = Role::whereIn('id', $validated['role_ids'])->pluck('name');
            $user->syncRoles($roles);
        }

        if (! empty($validated['department_ids'])) {
            $syncData = collect($validated['department_ids'])->mapWithKeys(fn($id, $index) => [
                $id => ['is_primary' => $index === 0],
            ])->toArray();
            $user->departments()->sync($syncData);
        }

        if (! empty($validated['manager_ids'])) {
            foreach ($validated['manager_ids'] as $managerId) {
                $user->managers()->attach($managerId, [
                    'relationship_type' => 'direct',
                    'is_primary'        => true,
                ]);
            }
        }

        return response()->json([
            'data'    => new UserResource($user->load(['roles', 'departments'])),
            'message' => 'User created successfully.',
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return response()->json([
            'data' => new UserResource(
                $user->load(['roles', 'departments', 'managers', 'loginActivities' => fn($q) => $q->latest('logged_at')->limit(5)])
            ),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'phone'       => ['nullable', 'string', 'max:20'],
            'employee_id' => ['nullable', 'string', Rule::unique('users', 'employee_id')->ignore($user->id)],
            'status'      => ['nullable', Rule::in(['active', 'inactive', 'suspended'])],
            'avatar_url'  => ['nullable', 'url'],
        ]);

        $user->update($validated);

        if ($request->has('role_ids')) {
            $roles = Role::whereIn('id', $request->role_ids)->pluck('name');
            $user->syncRoles($roles);
        }

        if ($request->has('department_ids')) {
            $syncData = collect($request->department_ids)->mapWithKeys(fn($id, $index) => [
                $id => ['is_primary' => $index === 0],
            ])->toArray();
            $user->departments()->sync($syncData);
        }

        return response()->json([
            'data'    => new UserResource($user->load(['roles', 'departments'])),
            'message' => 'User updated successfully.',
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        if ($user->isFounder()) {
            return response()->json(['message' => 'The founder account cannot be deleted.'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully.']);
    }

    public function syncRoles(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $request->validate([
            'role_ids'   => ['required', 'array'],
            'role_ids.*' => ['exists:roles,id'],
        ]);

        $roles = Role::whereIn('id', $request->role_ids)->pluck('name');
        $user->syncRoles($roles);

        return response()->json([
            'data'    => $user->getRoleNames(),
            'message' => 'Roles updated successfully.',
        ]);
    }

    public function syncDepartments(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $request->validate([
            'department_ids'   => ['required', 'array'],
            'department_ids.*' => ['exists:departments,id'],
        ]);

        $syncData = collect($request->department_ids)->mapWithKeys(fn($id, $index) => [
            $id => ['is_primary' => $index === 0],
        ])->toArray();

        $user->departments()->sync($syncData);

        return response()->json(['message' => 'Departments updated successfully.']);
    }
}
