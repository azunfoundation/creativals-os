<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadFollowup;
use App\Models\Quote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Lead::class);

        $user = $request->user();
        $query = Lead::query();

        // Respect Policy view boundaries (limit results to own leads for sales exec)
        if (!$user->isFounder() && !$user->hasPermissionTo('leads.view_all')) {
            $query->where(function ($q) use ($user) {
                $q->where('sales_exec_id', $user->id)
                  ->orWhere('sales_head_id', $user->id);
            });
        }

        // Filters
        if ($request->filled('stage_id')) {
            $query->where('stage_id', $request->integer('stage_id'));
        }

        if ($request->filled('sales_exec_id')) {
            $query->where('sales_exec_id', $request->integer('sales_exec_id'));
        }

        if ($request->filled('sales_head_id')) {
            $query->where('sales_head_id', $request->integer('sales_head_id'));
        }

        if ($request->filled('source_id')) {
            $query->where('lead_source_id', $request->integer('source_id'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->string('priority')->toString());
        }

        if ($request->filled('temperature')) {
            $query->where('temperature', $request->string('temperature')->toString());
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('lead_number', 'like', "%{$search}%")
                  ->orWhereHas('contacts', function ($qc) use ($search) {
                      $qc->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = $request->integer('per_page', 15);
        $leads = $query->with(['stage', 'source', 'salesExec', 'salesHead', 'contacts', 'activities.user'])
            ->latest()
            ->paginate($perPage);

        return LeadResource::collection($leads);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Lead::class);

        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'website_url' => ['nullable', 'string', 'max:255'],
            'whatsapp_number' => ['nullable', 'string', 'max:50'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'timezone' => ['nullable', 'string', 'max:50'],
            'lead_source_id' => ['nullable', 'integer', 'exists:lead_sources,id'],
            'stage_id' => ['nullable', 'integer', 'exists:lead_stages,id'],
            'sales_exec_id' => ['nullable', 'integer', 'exists:users,id'],
            'sales_head_id' => ['nullable', 'integer', 'exists:users,id'],
            'priority' => ['required', 'string', 'in:low,medium,high,urgent'],
            'temperature' => ['required', 'string', 'in:warm,hot,cold'],
            'estimated_monthly_budget' => ['nullable', 'numeric', 'min:0'],
            'expected_start_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'contacts' => ['nullable', 'array'],
            'contacts.*.name' => ['required', 'string', 'max:255'],
            'contacts.*.designation' => ['nullable', 'string', 'max:255'],
            'contacts.*.email' => ['nullable', 'email', 'max:255'],
            'contacts.*.phone' => ['nullable', 'string', 'max:50'],
            'contacts.*.whatsapp' => ['nullable', 'string', 'max:50'],
            'contacts.*.notes' => ['nullable', 'string'],
            'interested_service_ids' => ['nullable', 'array'],
            'interested_service_ids.*' => ['integer', 'exists:services,id'],
        ]);

        $lead = DB::transaction(function () use ($validated) {
            /** @var Lead $lead */
            $lead = Lead::create($validated);

            // Save contacts (first is primary)
            if (!empty($validated['contacts'])) {
                foreach ($validated['contacts'] as $index => $contactData) {
                    $lead->contacts()->create(array_merge($contactData, [
                        'is_primary' => $index === 0,
                    ]));
                }
            }

            // Attach interested services in lead_services
            if (!empty($validated['interested_service_ids'])) {
                $lead->services()->sync($validated['interested_service_ids']);
            }

            return $lead;
        });

        $lead->load(['stage', 'source', 'salesExec', 'salesHead', 'contacts', 'activities.user']);

        return (new LeadResource($lead))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Lead $lead): LeadResource
    {
        $this->authorize('view', $lead);

        $lead->load(['stage', 'source', 'salesExec', 'salesHead', 'contacts', 'activities.user']);

        return new LeadResource($lead);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Lead $lead): LeadResource
    {
        $this->authorize('update', $lead);

        $validated = $request->validate([
            'company_name' => ['sometimes', 'required', 'string', 'max:255'],
            'website_url' => ['nullable', 'string', 'max:255'],
            'whatsapp_number' => ['nullable', 'string', 'max:50'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'timezone' => ['nullable', 'string', 'max:50'],
            'lead_source_id' => ['nullable', 'integer', 'exists:lead_sources,id'],
            'stage_id' => ['nullable', 'integer', 'exists:lead_stages,id'],
            'sales_exec_id' => ['nullable', 'integer', 'exists:users,id'],
            'sales_head_id' => ['nullable', 'integer', 'exists:users,id'],
            'priority' => ['sometimes', 'required', 'string', 'in:low,medium,high,urgent'],
            'temperature' => ['sometimes', 'required', 'string', 'in:warm,hot,cold'],
            'estimated_monthly_budget' => ['nullable', 'numeric', 'min:0'],
            'expected_start_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'contacts' => ['nullable', 'array'],
            'contacts.*.name' => ['required', 'string', 'max:255'],
            'contacts.*.designation' => ['nullable', 'string', 'max:255'],
            'contacts.*.email' => ['nullable', 'email', 'max:255'],
            'contacts.*.phone' => ['nullable', 'string', 'max:50'],
            'contacts.*.whatsapp' => ['nullable', 'string', 'max:50'],
            'contacts.*.notes' => ['nullable', 'string'],
            'interested_service_ids' => ['nullable', 'array'],
            'interested_service_ids.*' => ['integer', 'exists:services,id'],
        ]);

        DB::transaction(function () use ($lead, $validated) {
            $lead->update($validated);

            // Sync contacts
            if (isset($validated['contacts'])) {
                $lead->contacts()->delete();
                foreach ($validated['contacts'] as $index => $contactData) {
                    $lead->contacts()->create(array_merge($contactData, [
                        'is_primary' => $index === 0,
                    ]));
                }
            }

            // Sync interested services
            if (isset($validated['interested_service_ids'])) {
                $lead->services()->sync($validated['interested_service_ids']);
            }
        });

        $lead->load(['stage', 'source', 'salesExec', 'salesHead', 'contacts', 'activities.user']);

        return new LeadResource($lead);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Lead $lead): JsonResponse
    {
        $this->authorize('delete', $lead);

        $lead->delete();

        return response()->json([
            'message' => 'Lead successfully deleted.',
        ]);
    }

    /**
     * Update the lead's stage.
     */
    public function updateStage(Request $request, Lead $lead): LeadResource
    {
        $this->authorize('update', $lead);

        $validated = $request->validate([
            'stage_id' => ['required', 'integer', 'exists:lead_stages,id'],
        ]);

        $lead->update([
            'stage_id' => $validated['stage_id'],
        ]);

        $lead->load(['stage', 'source', 'salesExec', 'salesHead', 'contacts', 'activities.user']);

        return new LeadResource($lead);
    }

    /**
     * Convert the lead.
     */
    public function convert(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);

        $validated = $request->validate([
            'quote_title' => ['required', 'string', 'max:255'],
            'valid_until' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $quote = DB::transaction(function () use ($lead, $validated) {
            // Find default currency or first currency, fallback to 1
            $currencyId = \App\Models\Currency::where('is_default', true)->first()->id 
                ?? \App\Models\Currency::first()->id 
                ?? 1;

            $budget = $lead->estimated_monthly_budget ?? 0.00;

            // Create Quote
            $quote = Quote::create([
                'lead_id' => $lead->id,
                'title' => $validated['quote_title'],
                'valid_until' => $validated['valid_until'],
                'status' => 'draft',
                'created_by' => auth()->id() ?? $lead->sales_exec_id ?? $lead->sales_head_id ?? \App\Models\User::first()->id ?? 1,
                'currency_id' => $currencyId,
                'exchange_rate' => 1.0000,
                'subtotal' => $budget,
                'total_amount' => $budget,
            ]);

            // Update lead status
            $lead->update([
                'is_converted' => true,
                'converted_client_id' => null, // Placeholder or stub for CRM flow
                'converted_at' => now(),
            ]);

            // Create lead activity
            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => auth()->id(),
                'type' => 'lead_converted',
                'description' => "Lead converted to Quote {$quote->quote_number}: {$quote->title}.",
                'metadata' => [
                    'quote_id' => $quote->id,
                    'quote_number' => $quote->quote_number,
                ],
                'occurred_at' => now(),
            ]);

            return $quote;
        });

        return response()->json([
            'message' => 'Lead successfully converted to Quote.',
            'quote_id' => $quote->id,
            'quote_number' => $quote->quote_number,
        ], 201);
    }

    /**
     * Log custom timeline activity for a lead.
     */
    public function logActivity(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);

        $validated = $request->validate([
            'type' => ['required', 'string', 'max:50'],
            'description' => ['required', 'string'],
            'due_at' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $currentUserId = auth()->id();

        $activity = DB::transaction(function () use ($lead, $validated, $currentUserId) {
            // Create LeadActivity
            $activity = LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $currentUserId,
                'type' => $validated['type'],
                'description' => $validated['description'],
                'occurred_at' => now(),
            ]);

            // If due_at is set, create a follow-up record
            if (!empty($validated['due_at'])) {
                LeadFollowup::create([
                    'lead_id' => $lead->id,
                    'assigned_to' => $lead->sales_exec_id ?: $currentUserId,
                    'created_by' => $currentUserId,
                    'description' => "Follow-up scheduled: " . $validated['description'],
                    'type' => $validated['type'],
                    'scheduled_at' => $validated['due_at'],
                    'is_completed' => false,
                ]);
            }

            return $activity;
        });

        return response()->json([
            'message' => 'Activity logged successfully.',
            'activity_id' => $activity->id,
        ], 201);
    }
}
