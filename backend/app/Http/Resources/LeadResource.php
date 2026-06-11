<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Lead
 */
class LeadResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_number' => $this->lead_number,
            'company_name' => $this->company_name,
            'website_url' => $this->website_url,
            'whatsapp_number' => $this->whatsapp_number,
            'city' => $this->city,
            'country' => $this->country,
            'timezone' => $this->timezone,
            'priority' => $this->priority,
            'temperature' => $this->temperature,
            'estimated_monthly_budget' => $this->estimated_monthly_budget,
            'expected_start_date' => $this->expected_start_date?->toDateString(),
            'notes' => $this->notes,
            'is_converted' => $this->is_converted,
            'converted_client_id' => $this->converted_client_id,
            'converted_at' => $this->converted_at?->toDateTimeString(),
            'lead_source' => $this->source ? [
                'id' => $this->source->id,
                'name' => $this->source->name,
            ] : null,
            'lead_stage' => $this->stage ? [
                'id' => $this->stage->id,
                'name' => $this->stage->name,
                'color' => $this->stage->color,
            ] : null,
            'sales_exec' => $this->salesExec ? [
                'id' => $this->salesExec->id,
                'name' => $this->salesExec->name,
            ] : null,
            'sales_head' => $this->salesHead ? [
                'id' => $this->salesHead->id,
                'name' => $this->salesHead->name,
            ] : null,
            'contacts' => LeadContactResource::collection($this->when(
                $this->relationLoaded('contacts'),
                fn() => $this->contacts,
                fn() => $this->contacts
            )),
            'activities' => LeadActivityResource::collection($this->when(
                $this->relationLoaded('activities'),
                fn() => $this->activities,
                fn() => $this->activities
            )),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
