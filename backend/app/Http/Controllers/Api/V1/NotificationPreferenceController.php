<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    /**
     * Get the authenticated user's notification preferences.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $preferences = NotificationPreference::where('user_id', $user->id)->get();

        return response()->json([
            'data' => $preferences,
        ]);
    }

    /**
     * Update the authenticated user's notification preferences.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'preferences' => ['required', 'array'],
            'preferences.*.event_type' => ['required', 'string'],
            'preferences.*.in_app' => ['required', 'boolean'],
            'preferences.*.email' => ['required', 'boolean'],
            'preferences.*.push' => ['required', 'boolean'],
        ]);

        foreach ($validated['preferences'] as $pref) {
            NotificationPreference::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'event_type' => $pref['event_type'],
                ],
                [
                    'in_app' => $pref['in_app'],
                    'email'  => $pref['email'],
                    'push'   => $pref['push'],
                ]
            );
        }

        return response()->json([
            'message' => 'Notification preferences updated successfully.',
            'data' => NotificationPreference::where('user_id', $user->id)->get(),
        ]);
    }
}
