<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_number' => $this->project_number,
            'name' => $this->name,
            'description' => $this->description,
            'client_id' => $this->client_id,
            'invoice_id' => $this->invoice_id,
            'manager_id' => $this->manager_id,
            'status' => $this->status,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'budget_hours' => $this->budget_hours,
            'budget_amount' => $this->budget_amount,
            'completion_percentage' => $this->completion_percentage,
            'is_recurring' => $this->is_recurring,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'members' => ProjectMemberResource::collection($this->whenLoaded('members')),
            'milestones_count' => $this->milestones_count ?? $this->milestones()->count(),
            'tasks_count' => $this->tasks_count ?? $this->tasks()->count(),
            'budget_used_hours' => (float) ($this->timesheets_sum_hours_logged ?? $this->timesheets()->whereIn('status', ['submitted', 'approved'])->sum('hours_logged')),
        ];
    }
}
