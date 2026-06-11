<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Currency;
use App\Models\Department;
use App\Models\EmployeeCompensation;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\LeadStage;
use App\Models\Project;
use App\Models\Quote;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Sprint8AReportsTest extends TestCase
{
    use RefreshDatabase;

    private User $founder;
    private User $director;
    private User $salesHead;
    private User $finance;
    private User $hr;
    private User $pm;
    private User $employee;
    private User $client;
    private Currency $inr;

    protected function setUp(): void
    {
        parent::setUp();

        // Migrate and seed database
        $this->seed();

        $this->inr = Currency::where('code', 'INR')->first() ?? Currency::factory()->create(['code' => 'INR', 'exchange_rate_to_inr' => 1.0000]);

        // Fetch seeded users and assign roles if needed
        $this->founder = User::where('email', 'founder@creativals.com')->first();
        
        $this->director = User::where('email', 'director@creativals.com')->first();
        
        $this->salesHead = User::where('email', 'sales@creativals.com')->first();
        if (!$this->salesHead) {
            $this->salesHead = User::factory()->create(['email' => 'sales@creativals.com', 'status' => 'active']);
            $this->salesHead->assignRole('sales_head');
        }

        $this->finance = User::where('email', 'finance@creativals.com')->first();
        if (!$this->finance) {
            $this->finance = User::factory()->create(['email' => 'finance@creativals.com', 'status' => 'active']);
            $this->finance->assignRole('finance');
        }

        $this->hr = User::where('email', 'hr@creativals.com')->first();
        if (!$this->hr) {
            $this->hr = User::factory()->create(['email' => 'hr@creativals.com', 'status' => 'active']);
            $this->hr->assignRole('hr');
        }

        $this->pm = User::where('email', 'pm@creativals.com')->first();
        if (!$this->pm) {
            $this->pm = User::factory()->create(['email' => 'pm@creativals.com', 'status' => 'active']);
            $this->pm->assignRole('project_manager');
        }

        $this->employee = User::where('email', 'dev@creativals.com')->first();
        if (!$this->employee) {
            $this->employee = User::factory()->create(['email' => 'dev@creativals.com', 'status' => 'active']);
            $this->employee->assignRole('employee');
        }

        $this->client = User::where('email', 'client@creativals.com')->first();
        if (!$this->client) {
            $this->client = User::factory()->create(['email' => 'client@creativals.com', 'status' => 'active']);
            $this->client->assignRole('client');
        }
    }

    /**
     * Test RBAC for Revenue report.
     */
    public function test_revenue_report_access_control(): void
    {
        // Founder has access
        $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/revenue')
            ->assertStatus(200);

        // Director has access
        $this->actingAs($this->director, 'sanctum')
            ->getJson('/api/v1/reports/revenue')
            ->assertStatus(200);

        // Finance has access
        $this->actingAs($this->finance, 'sanctum')
            ->getJson('/api/v1/reports/revenue')
            ->assertStatus(200);

        // PM does not have access
        $this->actingAs($this->pm, 'sanctum')
            ->getJson('/api/v1/reports/revenue')
            ->assertStatus(403);

        // Employee does not have access
        $this->actingAs($this->employee, 'sanctum')
            ->getJson('/api/v1/reports/revenue')
            ->assertStatus(403);
    }

    /**
     * Test RBAC for Pipeline report.
     */
    public function test_pipeline_report_access_control(): void
    {
        $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/pipeline')
            ->assertStatus(200);

        $this->actingAs($this->salesHead, 'sanctum')
            ->getJson('/api/v1/reports/pipeline')
            ->assertStatus(200);

        $this->actingAs($this->finance, 'sanctum')
            ->getJson('/api/v1/reports/pipeline')
            ->assertStatus(403);
    }

    /**
     * Test RBAC for Project Profitability report.
     */
    public function test_profitability_report_access_control(): void
    {
        $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/profitability')
            ->assertStatus(200);

        // PM has access to view project profitability
        $this->actingAs($this->pm, 'sanctum')
            ->getJson('/api/v1/reports/profitability')
            ->assertStatus(200);

        $this->actingAs($this->employee, 'sanctum')
            ->getJson('/api/v1/reports/profitability')
            ->assertStatus(403);
    }

    /**
     * Test Revenue summary data calculations.
     */
    public function test_revenue_report_calculations(): void
    {
        // Clear existing invoices to start clean
        Invoice::query()->forceDelete();

        // Create Invoices
        Invoice::create([
            'invoice_number' => 'INV-001',
            'client_id' => $this->client->id,
            'created_by' => $this->founder->id,
            'title' => 'Invoice 1',
            'currency_id' => $this->inr->id,
            'exchange_rate' => 1.0,
            'subtotal' => 10000.0,
            'total_amount' => 10000.0,
            'paid_amount' => 6000.0,
            'due_amount' => 4000.0,
            'status' => 'sent',
            'issue_date' => '2026-06-01',
            'due_date' => '2026-06-30',
        ]);

        Invoice::create([
            'invoice_number' => 'INV-002',
            'client_id' => $this->client->id,
            'created_by' => $this->founder->id,
            'title' => 'Invoice 2',
            'currency_id' => $this->inr->id,
            'exchange_rate' => 1.0,
            'subtotal' => 15000.0,
            'total_amount' => 15000.0,
            'paid_amount' => 15000.0,
            'due_amount' => 0.0,
            'status' => 'paid',
            'issue_date' => '2026-06-02',
            'due_date' => '2026-06-30',
        ]);

        // Get Revenue report
        $response = $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/revenue?from=2026-06-01&to=2026-06-30')
            ->assertStatus(200)
            ->json();

        $this->assertEquals(25000.0, $response['summary']['total_invoiced']);
        $this->assertEquals(21000.0, $response['summary']['total_collected']);
        $this->assertEquals(4000.0, $response['summary']['total_outstanding']);
        $this->assertEquals(84.0, $response['summary']['collection_rate_pct']);
        $this->assertEquals(2, $response['summary']['invoice_count']);
    }

    /**
     * Test Lead Pipeline report calculations and filtering by created/converted date.
     */
    public function test_pipeline_report_filtering(): void
    {
        Lead::truncate();

        $stage = LeadStage::first() ?? LeadStage::factory()->create();
        $source = LeadSource::first() ?? LeadSource::factory()->create();

        // Lead 1: Created inside period, converted inside period
        $lead1 = new Lead([
            'lead_number' => 'LD-001',
            'company_name' => 'Acme Corp',
            'lead_source_id' => $source->id,
            'stage_id' => $stage->id,
            'sales_exec_id' => $this->employee->id,
            'sales_head_id' => $this->salesHead->id,
            'created_by' => $this->founder->id,
            'priority' => 'high',
            'temperature' => 'hot',
            'estimated_monthly_budget' => 5000.00,
            'is_converted' => true,
            'converted_at' => '2026-06-10 10:00:00',
        ]);
        $lead1->created_at = '2026-06-01 10:00:00';
        $lead1->save();

        // Lead 2: Created inside period, NOT converted
        $lead2 = new Lead([
            'lead_number' => 'LD-002',
            'company_name' => 'Beta Corp',
            'lead_source_id' => $source->id,
            'stage_id' => $stage->id,
            'sales_exec_id' => $this->employee->id,
            'sales_head_id' => $this->salesHead->id,
            'created_by' => $this->founder->id,
            'priority' => 'medium',
            'temperature' => 'warm',
            'estimated_monthly_budget' => 3000.00,
            'is_converted' => false,
        ]);
        $lead2->created_at = '2026-06-05 10:00:00';
        $lead2->save();

        // Lead 3: Converted in range, created outside range
        $lead3 = new Lead([
            'lead_number' => 'LD-003',
            'company_name' => 'Gamma Corp',
            'lead_source_id' => $source->id,
            'stage_id' => $stage->id,
            'sales_exec_id' => $this->employee->id,
            'sales_head_id' => $this->salesHead->id,
            'created_by' => $this->founder->id,
            'priority' => 'low',
            'temperature' => 'cold',
            'estimated_monthly_budget' => 2000.00,
            'is_converted' => true,
            'converted_at' => '2026-06-15 10:00:00',
        ]);
        $lead3->created_at = '2026-05-15 10:00:00';
        $lead3->save();

        // Test filtering by lead created date
        $resCreated = $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/pipeline?from=2026-06-01&to=2026-06-30&lead_date_type=created')
            ->assertStatus(200)
            ->json();

        // Should find Lead 1 and Lead 2
        $this->assertEquals(2, $resCreated['summary']['total_leads']);
        $this->assertEquals(1, $resCreated['summary']['converted_leads']);

        // Test filtering by lead converted date
        $resConverted = $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/pipeline?from=2026-06-01&to=2026-06-30&lead_date_type=converted')
            ->assertStatus(200)
            ->json();

        // Should find Lead 1 and Lead 3 (only converted ones)
        $this->assertEquals(2, $resConverted['summary']['total_leads']);
        $this->assertEquals(2, $resConverted['summary']['converted_leads']);
    }

    /**
     * Test Quote funnel counts.
     */
    public function test_quote_funnel_calculations(): void
    {
        Quote::query()->forceDelete();

        Quote::create([
            'quote_number' => 'QT-001',
            'title' => 'Quote 1',
            'client_id' => $this->client->id,
            'created_by' => $this->founder->id,
            'currency_id' => $this->inr->id,
            'subtotal' => 10000.00,
            'total_amount' => 10000.00,
            'status' => 'converted',
            'created_at' => '2026-06-01',
        ]);

        Quote::create([
            'quote_number' => 'QT-002',
            'title' => 'Quote 2',
            'client_id' => $this->client->id,
            'created_by' => $this->founder->id,
            'currency_id' => $this->inr->id,
            'subtotal' => 5000.00,
            'total_amount' => 5000.00,
            'status' => 'rejected',
            'created_at' => '2026-06-02',
        ]);

        $response = $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/quotes?from=2026-06-01&to=2026-06-30')
            ->assertStatus(200)
            ->json();

        $this->assertEquals(2, $response['summary']['total_quotes']);
        $this->assertEquals(50.0, $response['summary']['win_rate_pct']);
    }

    /**
     * Test project profitability aggregates.
     */
    public function test_project_profitability_report(): void
    {
        Project::query()->forceDelete();
        Timesheet::query()->forceDelete();
        Expense::query()->forceDelete();

        $project = Project::create([
            'name' => 'Test Report Project',
            'client_id' => $this->client->id,
            'status' => 'active',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-30',
            'budget_amount' => 50000.00,
        ]);

        // Create compensation for employee
        $dept = Department::first() ?? Department::create(['name' => 'Engineering', 'slug' => 'engineering']);
        $this->employee->departments()->sync([$dept->id]);

        EmployeeCompensation::create([
            'user_id' => $this->employee->id,
            'compensation_type_id' => 1,
            'base_amount' => 80000.00,
            'currency_id' => $this->inr->id,
            'expected_monthly_hours' => 160.00,
            'hourly_rate' => 500.00,
            'effective_from' => '2026-01-01',
            'is_current' => true,
        ]);

        // Log 10 hours for employee on project
        Timesheet::create([
            'user_id' => $this->employee->id,
            'project_id' => $project->id,
            'date' => '2026-06-10',
            'hours_logged' => 10.00,
            'is_billable' => true,
            'status' => 'approved',
            'approved_by' => $this->pm->id,
        ]);

        // Log expense on project
        $category = ExpenseCategory::first() ?? ExpenseCategory::create(['name' => 'Travel', 'slug' => 'travel']);
        Expense::create([
            'expense_number' => 'EXP-999',
            'category_id' => $category->id,
            'project_id' => $project->id,
            'submitted_by' => $this->employee->id,
            'approved_by' => $this->pm->id,
            'title' => 'Project Travel',
            'amount' => 2000.00,
            'currency_id' => $this->inr->id,
            'expense_date' => '2026-06-15',
            'status' => 'approved',
        ]);

        $response = $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/profitability?from=2026-06-01&to=2026-06-30')
            ->assertStatus(200)
            ->json();

        // Expected labor cost: 10 hrs * 500 = 5000
        // Expected expense cost: 2000
        // Expected net profit: 50000 - (5000 + 2000) = 43000
        // Margin: (43000 / 50000) * 100 = 86%
        $this->assertEquals(50000.0, $response['summary']['total_revenue']);
        $this->assertEquals(5000.0, $response['summary']['total_labor_cost']);
        $this->assertEquals(2000.0, $response['summary']['total_expense_cost']);
        $this->assertEquals(43000.0, $response['summary']['total_net_profit']);
        $this->assertEquals(86.0, $response['summary']['avg_margin_pct']);
    }

    /**
     * Test employee utilisation aggregates.
     */
    public function test_employee_utilisation_report(): void
    {
        Timesheet::query()->forceDelete();

        $project = Project::create([
            'name' => 'Util Project',
            'client_id' => $this->client->id,
            'status' => 'active',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-30',
            'budget_amount' => 50000.00,
        ]);

        // Create compensation for employee
        EmployeeCompensation::where('user_id', $this->employee->id)->delete();
        EmployeeCompensation::create([
            'user_id' => $this->employee->id,
            'compensation_type_id' => 1,
            'base_amount' => 80000.00,
            'currency_id' => $this->inr->id,
            'expected_monthly_hours' => 160.00,
            'hourly_rate' => 0.00, // Derived hourly rate is base_amount / expected_monthly_hours = 500
            'effective_from' => '2026-01-01',
            'is_current' => true,
        ]);

        // Expected working hours in June 2026 range (30 days total)
        // If we log 80 hours total, utilisation is (80 / 160) * 100 = 50%
        Timesheet::create([
            'user_id' => $this->employee->id,
            'project_id' => $project->id,
            'date' => '2026-06-10',
            'hours_logged' => 80.00,
            'is_billable' => true,
            'status' => 'approved',
            'approved_by' => $this->pm->id,
        ]);

        $response = $this->actingAs($this->founder, 'sanctum')
            ->getJson('/api/v1/reports/utilisation?from=2026-06-01&to=2026-06-30')
            ->assertStatus(200)
            ->json();

        $this->assertNotEmpty($response['breakdown']);
        $empRow = collect($response['breakdown'])->where('user_id', $this->employee->id)->first();
        $this->assertNotNull($empRow);
        $this->assertEquals(160.00, $empRow['expected_hours']);
        $this->assertEquals(80.00, $empRow['logged_hours']);
        $this->assertEquals(50.00, $empRow['utilisation_pct']);
    }

    /**
     * Test CSV export for reporting endpoints.
     */
    public function test_reports_csv_export(): void
    {
        $this->actingAs($this->founder, 'sanctum')
            ->get('/api/v1/reports/revenue?export=csv')
            ->assertStatus(200)
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->assertHeader('Content-Disposition', 'attachment; filename="revenue_summary_report.csv"');
    }
}
