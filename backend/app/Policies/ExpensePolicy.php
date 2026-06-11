<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpensePolicy
{
    use HandlesAuthorization;

    public function before(User $authUser, string $ability): ?bool
    {
        if ($authUser->hasRole('founder')) {
            return true;
        }

        return null;
    }

    public function viewAny(User $authUser): bool
    {
        return true;
    }

    public function view(User $authUser, Expense $expense): bool
    {
        if ($authUser->hasRole('finance')) {
            return true;
        }

        if ($expense->submitted_by === $authUser->id) {
            return true;
        }

        if ($expense->project_id !== null && $expense->project?->manager_id === $authUser->id) {
            return true;
        }

        return false;
    }

    public function create(User $authUser): bool
    {
        return true;
    }

    public function update(User $authUser, Expense $expense): bool
    {
        if ($authUser->hasRole('finance')) {
            return true;
        }

        if ($expense->submitted_by === $authUser->id && $expense->status === 'draft') {
            return true;
        }

        return false;
    }

    public function delete(User $authUser, Expense $expense): bool
    {
        if ($authUser->hasRole('finance')) {
            return true;
        }

        if ($expense->submitted_by === $authUser->id && $expense->status === 'draft') {
            return true;
        }

        return false;
    }

    public function approve(User $authUser, Expense $expense): bool
    {
        if ($expense->project_id !== null && $expense->project?->manager_id === $authUser->id) {
            return true;
        }

        return $authUser->hasRole('finance');
    }
}
