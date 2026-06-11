<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PayrollRun;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PayrollPolicy
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
        return $authUser->hasRole('hr') || $authUser->hasRole('finance');
    }

    public function view(User $authUser, PayrollRun $payrollRun): bool
    {
        return $authUser->hasRole('hr') || $authUser->hasRole('finance');
    }

    public function create(User $authUser): bool
    {
        return $authUser->hasRole('hr') || $authUser->hasRole('finance');
    }

    public function update(User $authUser, PayrollRun $payrollRun): bool
    {
        return $authUser->hasRole('hr') || $authUser->hasRole('finance');
    }

    public function delete(User $authUser, PayrollRun $payrollRun): bool
    {
        return $authUser->hasRole('hr') || $authUser->hasRole('finance');
    }

    public function approve(User $authUser, PayrollRun $payrollRun): bool
    {
        return $authUser->hasRole('director');
    }
}
