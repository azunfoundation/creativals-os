<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\User;
use App\Models\Timesheet;
use App\Models\Bonus;
use App\Models\Currency;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class PayrollRunController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!Gate::allows('viewAny', PayrollRun::class)) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        $runs = PayrollRun::with(['submitter', 'approver', 'currency'])
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->paginate($request->integer('per_page', 15));

        return response()->json($runs);
    }

    public function store(Request $request): JsonResponse
    {
        if (!Gate::allows('create', PayrollRun::class)) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'notes' => ['nullable', 'string'],
        ]);

        $year = (int) $validated['year'];
        $month = (int) $validated['month'];

        // Check if run already exists
        if (PayrollRun::where('year', $year)->where('month', $month)->exists()) {
            return response()->json([
                'message' => 'A payroll run for this month and year already exists.'
            ], 422);
        }

        $currency = Currency::where('is_default', true)->first() ?? Currency::first();
        if (!$currency) {
            return response()->json(['message' => 'No active currency found.'], 500);
        }

        $payrollRun = DB::transaction(function () use ($year, $month, $validated, $currency, $request) {
            $run = PayrollRun::create([
                'year' => $year,
                'month' => $month,
                'status' => 'draft',
                'submitted_by' => $request->user()->id,
                'currency_id' => $currency->id,
                'notes' => $validated['notes'] ?? null,
                'total_gross' => 0.00,
                'total_deductions' => 0.00,
                'total_net' => 0.00,
            ]);

            $activeEmployees = User::where('status', 'active')
                ->where('is_client_portal_user', false)
                ->get();

            $totalGross = 0.00;
            $totalDeductions = 0.00;
            $totalNet = 0.00;

            foreach ($activeEmployees as $employee) {
                $comp = $employee->compensation;
                $hourlyRate = $employee->hourly_rate; // utilizes our getHourlyRateAttribute()
                
                // Fetch timesheet hours approved for this employee in the month/year
                $hoursLogged = (float) Timesheet::where('user_id', $employee->id)
                    ->whereYear('date', $year)
                    ->whereMonth('date', $month)
                    ->where('status', 'approved')
                    ->sum('hours_logged');

                // Determine base salary based on compensation type
                $baseSalary = 0.00;
                $compType = $comp?->compensationType?->type;

                if ($compType === 'hourly') {
                    $baseSalary = $hoursLogged * $hourlyRate;
                } elseif ($compType === 'fixed') {
                    $baseSalary = (float) ($comp?->base_amount ?? 0.00);
                } elseif ($compType === 'hybrid') {
                    $baseSalary = (float) ($comp?->base_amount ?? 0.00) + ($hoursLogged * $hourlyRate);
                }

                // Fetch approved bonuses for the user in this month/year not already linked
                $bonuses = Bonus::where('user_id', $employee->id)
                    ->where('status', 'approved')
                    ->whereYear('effective_date', $year)
                    ->whereMonth('effective_date', $month)
                    ->whereNull('payroll_run_id')
                    ->get();

                $bonusAmount = (float) $bonuses->sum('amount');
                
                // Link bonuses to this run
                foreach ($bonuses as $bonus) {
                    $bonus->update([
                        'payroll_run_id' => $run->id,
                        'status' => 'paid',
                    ]);
                }

                $deductions = 0.00;
                $netSalary = $baseSalary + $bonusAmount - $deductions;

                $expectedHours = (float) ($comp?->expected_monthly_hours ?? 0.00);
                $utilizationRate = $expectedHours > 0 ? round(($hoursLogged / $expectedHours) * 100, 2) : 0.00;

                $breakdown = [
                    'compensation_type' => $compType ?? 'none',
                    'base_amount' => $comp?->base_amount ?? 0.00,
                    'hourly_rate' => $hourlyRate,
                    'hours_logged' => $hoursLogged,
                    'expected_hours' => $expectedHours,
                ];

                PayrollRunItem::create([
                    'payroll_run_id' => $run->id,
                    'user_id' => $employee->id,
                    'base_salary' => $baseSalary,
                    'bonus_amount' => $bonusAmount,
                    'deductions' => $deductions,
                    'net_salary' => $netSalary,
                    'hours_logged' => $hoursLogged,
                    'expected_hours' => $expectedHours,
                    'utilization_rate' => $utilizationRate,
                    'breakdown' => $breakdown,
                ]);

                $totalGross += ($baseSalary + $bonusAmount);
                $totalDeductions += $deductions;
                $totalNet += $netSalary;
            }

            $run->update([
                'total_gross' => $totalGross,
                'total_deductions' => $totalDeductions,
                'total_net' => $totalNet,
            ]);

            return $run;
        });

        return response()->json($payrollRun->load('items.user'), 201);
    }

    public function show(PayrollRun $payrollRun): JsonResponse
    {
        if (!Gate::allows('view', $payrollRun)) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        return response()->json($payrollRun->load(['submitter', 'approver', 'currency', 'items.user', 'items.adjustments']));
    }

    public function approve(Request $request, PayrollRun $payrollRun): JsonResponse
    {
        if (!Gate::allows('approve', $payrollRun)) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        $payrollRun->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'message' => 'Payroll run approved successfully.',
            'payroll_run' => $payrollRun
        ]);
    }

    public function costAllocation(Request $request): JsonResponse
    {
        if (!Gate::allows('viewAny', PayrollRun::class)) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        $validated = $request->validate([
            'year' => ['nullable', 'integer'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $year = (int) ($validated['year'] ?? now()->year);
        $month = (int) ($validated['month'] ?? now()->month);

        // Fetch all approved timesheets for the period
        $timesheets = Timesheet::with(['user.compensation', 'project'])
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->where('status', 'approved')
            ->whereNotNull('project_id')
            ->get();

        $projectCosts = [];

        foreach ($timesheets as $ts) {
            $projectId = $ts->project_id;
            $project = $ts->project;
            $user = $ts->user;
            if (!$project || !$user) {
                continue;
            }

            if (!isset($projectCosts[$projectId])) {
                $projectCosts[$projectId] = [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'project_number' => $project->project_number,
                    'total_hours' => 0.00,
                    'total_labor_cost' => 0.00,
                    'breakdown' => [],
                ];
            }

            $hourlyRate = $user->hourly_rate;
            $cost = $ts->hours_logged * $hourlyRate;

            $projectCosts[$projectId]['total_hours'] += $ts->hours_logged;
            $projectCosts[$projectId]['total_labor_cost'] += $cost;

            $userId = $user->id;
            if (!isset($projectCosts[$projectId]['breakdown'][$userId])) {
                $projectCosts[$projectId]['breakdown'][$userId] = [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'hours_logged' => 0.00,
                    'hourly_rate' => $hourlyRate,
                    'cost' => 0.00,
                ];
            }

            $projectCosts[$projectId]['breakdown'][$userId]['hours_logged'] += $ts->hours_logged;
            $projectCosts[$projectId]['breakdown'][$userId]['cost'] += $cost;
        }

        // Standardize lists
        $result = [];
        foreach ($projectCosts as $projId => $data) {
            $data['breakdown'] = array_values($data['breakdown']);
            $result[] = $data;
        }

        return response()->json($result);
    }
}
