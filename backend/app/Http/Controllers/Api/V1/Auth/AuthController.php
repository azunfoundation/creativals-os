<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\LoginActivity;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login and issue API token.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'       => ['required', 'email'],
            'password'    => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::where('email', $request->email)
            ->where('is_client_portal_user', false)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            $this->logActivity($user?->id, $request, 'failed');

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated. Please contact your administrator.'],
            ]);
        }

        // Update last login
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $this->logActivity($user->id, $request, 'success');

        $deviceName = $request->device_name ?? ($request->userAgent() ?? 'web');
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'token'   => $token,
            'user'    => $this->formatUser($user),
            'message' => 'Login successful.',
        ]);
    }

    /**
     * Logout and revoke current token.
     */
    public function logout(Request $request): JsonResponse
    {
        $this->logActivity($request->user()->id, $request, 'logout');
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * Logout from all devices.
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $this->logActivity($request->user()->id, $request, 'logout');
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out from all devices.']);
    }

    /**
     * Get authenticated user with roles and permissions.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['departments', 'roles.permissions']);

        return response()->json([
            'data' => $this->formatUser($user),
        ]);
    }

    /**
     * Get login activity for current user.
     */
    public function loginActivity(Request $request): JsonResponse
    {
        $activities = $request->user()
            ->loginActivities()
            ->latest('logged_at')
            ->paginate(20);

        return response()->json($activities);
    }

    // ─── Private Helpers ─────────────────────────────────────

    private function logActivity(?int $userId, Request $request, string $status): void
    {
        LoginActivity::create([
            'user_id'     => $userId,
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
            'device_type' => $this->detectDevice($request->userAgent()),
            'status'      => $status,
            'logged_at'   => now(),
        ]);
    }

    private function detectDevice(?string $userAgent): string
    {
        if (! $userAgent) return 'unknown';
        if (str_contains($userAgent, 'Mobile')) return 'mobile';
        if (str_contains($userAgent, 'Tablet')) return 'tablet';
        return 'desktop';
    }

    private function formatUser(User $user): array
    {
        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'phone'       => $user->phone,
            'employee_id' => $user->employee_id,
            'avatar_url'  => $user->avatar_url,
            'status'      => $user->status,
            'roles'       => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'departments' => $user->departments->map(fn($d) => [
                'id'         => $d->id,
                'name'       => $d->name,
                'is_primary' => $d->pivot->is_primary,
            ]),
            'last_login_at' => $user->last_login_at,
            'created_at'    => $user->created_at,
        ];
    }
}
