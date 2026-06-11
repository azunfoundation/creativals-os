<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Quote;
use App\Models\User;
use App\Services\FinancialReportService;
use App\Services\LeadReportService;
use App\Services\ProfitabilityService;
use App\Services\UtilisationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    protected FinancialReportService $financialService;
    protected LeadReportService $leadService;
    protected ProfitabilityService $profitabilityService;
    protected UtilisationService $utilisationService;

    public function __construct(
        FinancialReportService $financialService,
        LeadReportService $leadService,
        ProfitabilityService $profitabilityService,
        UtilisationService $utilisationService
    ) {
        $this->financialService = $financialService;
        $this->leadService = $leadService;
        $this->profitabilityService = $profitabilityService;
        $this->utilisationService = $utilisationService;
    }

    /**
     * Helper to get standard date range (Indian Financial Year default).
     */
    protected function getDateRange(Request $request): array
    {
        $now = Carbon::now();
        // Indian FY: Apr 1 -> Mar 31
        if ($now->month >= 4) {
            $defaultFrom = Carbon::create($now->year, 4, 1)->startOfDay();
            $defaultTo = Carbon::create($now->year + 1, 3, 31)->endOfDay();
        } else {
            $defaultFrom = Carbon::create($now->year - 1, 4, 1)->startOfDay();
            $defaultTo = Carbon::create($now->year, 3, 31)->endOfDay();
        }

        $from = $request->input('from') ? Carbon::parse($request->input('from'))->startOfDay() : $defaultFrom;
        $to = $request->input('to') ? Carbon::parse($request->input('to'))->endOfDay() : $defaultTo;

        return [$from, $to];
    }

    /**
     * Helper to stream CSV response.
     */
    protected function streamCsv(array $headers, array $rows, string $filename): StreamedResponse
    {
        $callback = function () use ($headers, $rows) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            foreach ($rows as $row) {
                fputcsv($file, (array) $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * 1. Revenue Summary Report
     * Route: GET /api/v1/reports/revenue
     */
    public function revenueSummary(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermissionTo('reports.view_financial')) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        list($from, $to) = $this->getDateRange($request);
        $data = $this->financialService->getRevenueSummary($from, $to);

        if ($request->input('export') === 'csv') {
            $headers = ['Month Key', 'Invoiced Amount (INR)', 'Collected Amount (INR)'];
            $rows = [];
            foreach ($data['trend'] as $t) {
                $rows[] = [$t->month_key, $t->invoiced_amount, $t->collected_amount];
            }
            return $this->streamCsv($headers, $rows, 'revenue_summary_report.csv');
        }

        return response()->json($data);
    }

    /**
     * 2. Sales Pipeline Report
     * Route: GET /api/v1/reports/pipeline
     */
    public function salesPipeline(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermissionTo('reports.view_sales')) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        list($from, $to) = $this->getDateRange($request);
        $dateType = $request->input('lead_date_type', 'created');

        $data = $this->leadService->getPipelineSummary($from, $to, $dateType);

        if ($request->input('export') === 'csv') {
            $headers = ['Stage Name', 'Lead Count', 'Total Budget (INR)'];
            $rows = [];
            foreach ($data['by_stage'] as $s) {
                $rows[] = [$s->stage_name, $s->lead_count, $s->total_budget];
            }
            return $this->streamCsv($headers, $rows, 'sales_pipeline_report.csv');
        }

        return response()->json($data);
    }

    /**
     * 3. Quote Conversion Report
     * Route: GET /api/v1/reports/quotes
     */
    public function quoteConversion(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyPermission(['reports.view_sales', 'reports.view_financial'])) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        list($from, $to) = $this->getDateRange($request);

        // Calculate quote KPIs
        $quoteStats = DB::table('quotes')
            ->select(
                DB::raw('count(id) as total_quotes'),
                DB::raw('sum(case when status = "draft" then 1 else 0 end) as draft_count'),
                DB::raw('sum(case when status = "pending" then 1 else 0 end) as pending_count'),
                DB::raw('sum(case when status = "approved" then 1 else 0 end) as approved_count'),
                DB::raw('sum(case when status = "sent" then 1 else 0 end) as sent_count'),
                DB::raw('sum(case when status = "converted" then 1 else 0 end) as won_count'),
                DB::raw('sum(case when status = "rejected" then 1 else 0 end) as rejected_count'),
                DB::raw('avg(total_amount) as avg_quote_value'),
                DB::raw('sum(case when status in ("approved", "sent", "converted") then total_amount else 0 end) as total_quote_value')
            )
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])
            ->first();

        $totalQuotes = (int) ($quoteStats->total_quotes ?? 0);
        $wonCount = (int) ($quoteStats->won_count ?? 0);
        $rejectedCount = (int) ($quoteStats->rejected_count ?? 0);

        $winRatePct = ($wonCount + $rejectedCount) > 0
            ? round(($wonCount / ($wonCount + $rejectedCount)) * 100, 2)
            : 0.00;

        $funnel = [
            ['stage' => 'Draft', 'count' => (int) ($quoteStats->draft_count ?? 0)],
            ['stage' => 'Pending Approval', 'count' => (int) ($quoteStats->pending_count ?? 0)],
            ['stage' => 'Approved', 'count' => (int) ($quoteStats->approved_count ?? 0)],
            ['stage' => 'Sent', 'count' => (int) ($quoteStats->sent_count ?? 0)],
            ['stage' => 'Won', 'count' => $wonCount],
            ['stage' => 'Rejected', 'count' => $rejectedCount],
        ];

        // Top Services by Quote count/value
        $topServices = DB::table('quote_items')
            ->join('quotes', 'quote_items.quote_id', '=', 'quotes.id')
            ->select(
                'quote_items.description as service_name',
                DB::raw('count(quotes.id) as quote_count'),
                DB::raw('sum(quote_items.total_amount) as total_value')
            )
            ->whereNull('quotes.deleted_at')
            ->whereBetween('quotes.created_at', [$from->startOfDay(), $to->endOfDay()])
            ->groupBy('quote_items.description')
            ->orderBy('total_value', 'desc')
            ->limit(5)
            ->get();

        $data = [
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'summary' => [
                'total_quotes' => $totalQuotes,
                'draft_count' => (int) ($quoteStats->draft_count ?? 0),
                'pending_count' => (int) ($quoteStats->pending_count ?? 0),
                'approved_count' => (int) ($quoteStats->approved_count ?? 0),
                'sent_count' => (int) ($quoteStats->sent_count ?? 0),
                'won_count' => $wonCount,
                'rejected_count' => $rejectedCount,
                'win_rate_pct' => $winRatePct,
                'avg_quote_value' => round((float) ($quoteStats->avg_quote_value ?? 0.0), 2),
                'total_quote_value' => round((float) ($quoteStats->total_quote_value ?? 0.0), 2),
            ],
            'funnel' => $funnel,
            'top_services' => $topServices,
        ];

        if ($request->input('export') === 'csv') {
            $headers = ['Stage', 'Count'];
            return $this->streamCsv($headers, $funnel, 'quote_conversion_funnel.csv');
        }

        return response()->json($data);
    }

    /**
     * 4. Project Profitability Report
     * Route: GET /api/v1/reports/profitability
     */
    public function projectProfitability(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermissionTo('reports.view_financial') && !$user->hasRole('project_manager')) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        list($from, $to) = $this->getDateRange($request);

        // PM is scoped to their own managed projects
        $projectsQuery = Project::query();
        if (!$user->hasAnyPermission(['reports.view_financial', 'reports.view']) && $user->hasRole('project_manager')) {
            $projectsQuery->where('manager_id', $user->id);
        }

        $projectsQuery->whereBetween('start_date', [$from->toDateString(), $to->toDateString()]);
        $projects = $projectsQuery->get();

        $breakdown = [];
        $totalRevenue = 0.0;
        $totalLabor = 0.0;
        $totalExpenses = 0.0;
        $totalCost = 0.0;
        $totalProfit = 0.0;

        foreach ($projects as $proj) {
            $profit = $this->profitabilityService->calculate($proj, $from, $to);
            $breakdown[] = $profit;

            $totalRevenue += $profit['revenue'];
            $totalLabor += $profit['labor_cost'];
            $totalExpenses += $profit['expense_cost'];
            $totalCost += $profit['total_cost'];
            $totalProfit += $profit['net_profit'];
        }

        $avgMarginPct = $totalRevenue > 0
            ? round(($totalProfit / $totalRevenue) * 100, 2)
            : 0.00;

        $data = [
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'summary' => [
                'project_count' => $projects->count(),
                'total_revenue' => round($totalRevenue, 2),
                'total_labor_cost' => round($totalLabor, 2),
                'total_expense_cost' => round($totalExpenses, 2),
                'total_net_profit' => round($totalProfit, 2),
                'avg_margin_pct' => $avgMarginPct,
            ],
            'breakdown' => $breakdown,
        ];

        if ($request->input('export') === 'csv') {
            $headers = ['Project Name', 'Project Number', 'Status', 'Revenue', 'Labor Cost', 'Expense Cost', 'Net Profit', 'Margin %'];
            $rows = [];
            foreach ($breakdown as $row) {
                $rows[] = [
                    $row['project_name'],
                    $row['project_number'],
                    $row['status'],
                    $row['revenue'],
                    $row['labor_cost'],
                    $row['expense_cost'],
                    $row['net_profit'],
                    $row['margin_percentage'],
                ];
            }
            return $this->streamCsv($headers, $rows, 'project_profitability_report.csv');
        }

        return response()->json($data);
    }

    /**
     * 5. Team Utilisation Report
     * Route: GET /api/v1/reports/utilisation
     */
    public function teamUtilisation(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermissionTo('reports.view_hr') && !$user->hasRole('project_manager')) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        list($from, $to) = $this->getDateRange($request);

        // Query active users with timesheets
        $usersQuery = User::query()->where('status', 'active')->where('is_client_portal_user', false);

        // PM can only view users in their team (users who logged timesheets on projects managed by the PM)
        if (!$user->hasPermissionTo('reports.view_hr') && $user->hasRole('project_manager')) {
            $pmProjectUserIds = DB::table('timesheets')
                ->join('projects', 'timesheets.project_id', '=', 'projects.id')
                ->where('projects.manager_id', $user->id)
                ->pluck('timesheets.user_id')
                ->unique();
            $usersQuery->whereIn('id', $pmProjectUserIds);
        }

        $users = $usersQuery->with(['departments'])->get();

        $breakdown = [];
        $totalExpected = 0.0;
        $totalLogged = 0.0;
        $totalBillable = 0.0;

        foreach ($users as $u) {
            $util = $this->utilisationService->calculateForUser($u, $from, $to);
            if ($util['expected_hours'] > 0 || $util['logged_hours'] > 0) {
                $breakdown[] = $util;
                $totalExpected += $util['expected_hours'];
                $totalLogged += $util['logged_hours'];
                $totalBillable += $util['billable_hours'];
            }
        }

        $avgUtilisationPct = $totalExpected > 0
            ? round(($totalLogged / $totalExpected) * 100, 2)
            : 0.00;

        $billableRatePct = $totalLogged > 0
            ? round(($totalBillable / $totalLogged) * 100, 2)
            : 0.00;

        // Top Projects by hours
        $topProjects = DB::table('timesheets')
            ->join('projects', 'timesheets.project_id', '=', 'projects.id')
            ->select(
                'projects.name as project_name',
                DB::raw('sum(timesheets.hours_logged) as total_hours'),
                DB::raw('sum(case when timesheets.is_billable = 1 then timesheets.hours_logged else 0 end) as billable_hours')
            )
            ->whereNull('timesheets.deleted_at')
            ->whereIn('timesheets.status', ['submitted', 'approved'])
            ->whereBetween('timesheets.date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('projects.name')
            ->orderBy('total_hours', 'desc')
            ->limit(5)
            ->get();

        $data = [
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'summary' => [
                'team_size' => count($breakdown),
                'total_logged_hours' => round($totalLogged, 2),
                'total_billable_hours' => round($totalBillable, 2),
                'billable_rate_pct' => $billableRatePct,
                'avg_utilisation_pct' => $avgUtilisationPct,
            ],
            'breakdown' => $breakdown,
            'top_projects_by_hours' => $topProjects,
        ];

        if ($request->input('export') === 'csv') {
            $headers = ['Employee Name', 'Department', 'Expected Hours', 'Logged Hours', 'Billable Hours', 'Utilisation %', 'Billable Rate %'];
            $rows = [];
            foreach ($breakdown as $row) {
                $rows[] = [
                    $row['user_name'],
                    $row['department'],
                    $row['expected_hours'],
                    $row['logged_hours'],
                    $row['billable_hours'],
                    $row['utilisation_pct'],
                    $row['billable_rate_pct'],
                ];
            }
            return $this->streamCsv($headers, $rows, 'team_utilisation_report.csv');
        }

        return response()->json($data);
    }

    /**
     * 6. Expense Breakdown Report
     * Route: GET /api/v1/reports/expenses
     */
    public function expenseBreakdown(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermissionTo('reports.view_financial')) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        list($from, $to) = $this->getDateRange($request);

        $data = $this->financialService->getExpenseBreakdown($from, $to);

        if ($request->input('export') === 'csv') {
            $headers = ['Category', 'Count', 'Total Amount (INR)'];
            $rows = [];
            foreach ($data['by_category'] as $c) {
                $rows[] = [$c->category_name, $c->count, $c->total_amount];
            }
            return $this->streamCsv($headers, $rows, 'expenses_by_category_report.csv');
        }

        return response()->json($data);
    }

    /**
     * 7. Payroll Summary Report
     * Route: GET /api/v1/reports/payroll
     */
    public function payrollSummary(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyPermission(['reports.view_hr', 'reports.view_financial'])) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        list($from, $to) = $this->getDateRange($request);

        $data = $this->financialService->getPayrollSummary($from, $to);

        if ($request->input('export') === 'csv') {
            $headers = ['Payroll Run Number', 'Year', 'Month', 'Status', 'Total Gross (INR)', 'Total Net (INR)', 'Employee Count'];
            $rows = [];
            foreach ($data['by_month'] as $run) {
                $rows[] = [$run->run_number, $run->year, $run->month, $run->status, $run->total_gross, $run->total_net, $run->employee_count];
            }
            return $this->streamCsv($headers, $rows, 'payroll_summary_report.csv');
        }

        return response()->json($data);
    }

    /**
     * 8. Client Summary Report
     * Route: GET /api/v1/reports/clients
     */
    public function clientSummary(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyPermission(['reports.view_sales', 'reports.view_financial'])) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        list($from, $to) = $this->getDateRange($request);

        $data = $this->financialService->getClientSummary($from, $to);

        if ($request->input('export') === 'csv') {
            $headers = ['Client Name', 'Client Email', 'Active Projects', 'Total Projects', 'Total Billed (INR)', 'Total Paid (INR)', 'Total Outstanding (INR)'];
            $rows = [];
            foreach ($data['breakdown'] as $row) {
                $rows[] = [
                    $row['client_name'],
                    $row['client_email'],
                    $row['active_projects'],
                    $row['total_projects'],
                    $row['total_billed'],
                    $row['total_paid'],
                    $row['total_outstanding'],
                ];
            }
            return $this->streamCsv($headers, $rows, 'client_summary_report.csv');
        }

        return response()->json($data);
    }
}
