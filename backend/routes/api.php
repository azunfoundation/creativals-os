<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\RecoveryController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\LeadSourceController;
use App\Http\Controllers\Api\V1\LeadStageController;
use App\Http\Controllers\Api\V1\AlertController;
use App\Http\Controllers\Api\V1\ServiceCategoryController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\PackageController;
use App\Http\Controllers\Api\V1\DiscountCouponController;
use App\Http\Controllers\Api\V1\QuoteController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\RecurringBillingRuleController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\MilestoneController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\TimesheetController;
use App\Http\Controllers\Api\V1\PayrollRunController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\VendorController;
use App\Http\Controllers\Api\V1\PortalController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\BackupController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Creativals OS v1
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api automatically by Laravel's bootstrap.
| Additional v1 prefix is applied here for versioning.
|
*/

Route::prefix('v1')->name('api.v1.')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication Routes (Public)
    |--------------------------------------------------------------------------
    */
    Route::prefix('auth')->name('auth.')->group(function () {

        // Login — rate limited at 5 attempts per minute
        Route::post('/login', [AuthController::class, 'login'])
            ->name('login')
            ->middleware('throttle:login');

        // Protected auth routes
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout',      [AuthController::class, 'logout'])->name('logout');
            Route::post('/logout-all',  [AuthController::class, 'logoutAll'])->name('logout-all');
            Route::get('/me',           [AuthController::class, 'me'])->name('me');
            Route::get('/login-activity', [AuthController::class, 'loginActivity'])->name('login-activity');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Protected API Routes — Require Authentication
    |--------------------------------------------------------------------------
    */
    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

        /*
        |----------------------------------------------------------------------
        | Users
        |----------------------------------------------------------------------
        */
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/',    [UserController::class, 'index'])->name('index');
            Route::post('/',   [UserController::class, 'store'])->name('store');

            Route::prefix('{user}')->group(function () {
                Route::get('/',    [UserController::class, 'show'])->name('show');
                Route::put('/',    [UserController::class, 'update'])->name('update');
                Route::delete('/', [UserController::class, 'destroy'])->name('destroy');

                // Assign roles to user
                Route::put('/roles',       [UserController::class, 'syncRoles'])->name('sync-roles');

                // Assign departments to user
                Route::put('/departments', [UserController::class, 'syncDepartments'])->name('sync-departments');
            });
        });

        /*
        |----------------------------------------------------------------------
        | Roles & Permissions
        |----------------------------------------------------------------------
        */
        Route::prefix('roles')->name('roles.')->group(function () {
            Route::get('/',    [RoleController::class, 'index'])->name('index');
            Route::post('/',   [RoleController::class, 'store'])->name('store');

            Route::prefix('{role}')->group(function () {
                Route::get('/',    [RoleController::class, 'show'])->name('show');
                Route::put('/',    [RoleController::class, 'update'])->name('update');
                Route::delete('/', [RoleController::class, 'destroy'])->name('destroy');

                // Sync permissions to a role
                Route::put('/permissions', [RoleController::class, 'syncPermissions'])->name('sync-permissions');
            });
        });

        // List all permissions grouped by module
        Route::get('/permissions', [RoleController::class, 'permissions'])->name('permissions.index');

        /*
        |----------------------------------------------------------------------
        | Departments
        |----------------------------------------------------------------------
        */
        Route::prefix('departments')->name('departments.')->group(function () {
            Route::get('/',    [DepartmentController::class, 'index'])->name('index');
            Route::post('/',   [DepartmentController::class, 'store'])->name('store');

            Route::prefix('{department}')->group(function () {
                Route::get('/',    [DepartmentController::class, 'show'])->name('show');
                Route::put('/',    [DepartmentController::class, 'update'])->name('update');
                Route::delete('/', [DepartmentController::class, 'destroy'])->name('destroy');
            });
        });

        /*
        |----------------------------------------------------------------------
        | Recovery Bin (Founder-only enforced in controller via Gate)
        |----------------------------------------------------------------------
        */
        Route::prefix('recovery-bin')->name('recovery.')->group(function () {
            Route::get('/', [RecoveryController::class, 'index'])->name('index');
            Route::post('/{id}/restore', [RecoveryController::class, 'restore'])->name('restore');
        });

        /*
        |----------------------------------------------------------------------
        | CRM Sprint 2
        |----------------------------------------------------------------------
        */
        Route::apiResource('leads', LeadController::class);
        Route::patch('leads/{lead}/stage', [LeadController::class, 'updateStage'])->name('leads.stage');
        Route::post('leads/{lead}/convert', [LeadController::class, 'convert'])->name('leads.convert');
        Route::post('leads/{lead}/activities', [LeadController::class, 'logActivity'])->name('leads.activities');

        Route::apiResource('lead-stages', LeadStageController::class);
        Route::apiResource('lead-sources', LeadSourceController::class);

        Route::prefix('alerts')->name('alerts.')->group(function () {
            Route::get('/', [AlertController::class, 'index'])->name('index');
            Route::post('/read-all', [AlertController::class, 'markAllRead'])->name('read-all');
            Route::post('/{id}/read', [AlertController::class, 'markRead'])->name('read');
        });

        /*
        |----------------------------------------------------------------------
        | Catalog & Quotations Sprint 3
        |----------------------------------------------------------------------
        */
        Route::apiResource('service-categories', ServiceCategoryController::class);
        Route::apiResource('services', ServiceController::class);
        Route::apiResource('packages', PackageController::class);

        Route::get('discount-coupons/{code}/validate', [DiscountCouponController::class, 'validateCoupon'])->name('discount-coupons.validate');
        Route::apiResource('discount-coupons', DiscountCouponController::class);

        Route::get('quotes/{id}/pdf', [QuoteController::class, 'generatePdf'])->name('quotes.pdf');
        Route::post('quotes/{id}/submit-approval', [QuoteController::class, 'submitApproval'])->name('quotes.submit-approval');
        Route::post('quotes/{id}/approve', [QuoteController::class, 'approve'])->name('quotes.approve');
        Route::post('quotes/{id}/reject', [QuoteController::class, 'reject'])->name('quotes.reject');
        Route::apiResource('quotes', QuoteController::class);

        /*
        |----------------------------------------------------------------------
        | Invoices, Payments, & Recurring Rules Sprint 4
        |----------------------------------------------------------------------
        */
        Route::apiResource('recurring-billing-rules', RecurringBillingRuleController::class);
        Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'recordPayment'])->name('invoices.payments');
        Route::post('invoices/{id}/submit-approval', [InvoiceController::class, 'submitApproval'])->name('invoices.submit-approval');
        Route::post('invoices/{id}/review', [InvoiceController::class, 'review'])->name('invoices.review');
        Route::post('invoices/{id}/approve', [InvoiceController::class, 'approve'])->name('invoices.approve');
        Route::post('invoices/{id}/reject', [InvoiceController::class, 'reject'])->name('invoices.reject');
        Route::apiResource('invoices', InvoiceController::class);
        Route::apiResource('payments', PaymentController::class)->only(['index', 'show', 'destroy']);

        // ─── Project Management, Tasks, & Timesheets Sprint 5 ──────────────
        // Projects
        Route::get('projects/{project}/profitability', [ProjectController::class, 'profitability']);
        Route::post('projects/{project}/members', [ProjectController::class, 'addMember']);
        Route::delete('projects/{project}/members/{user}', [ProjectController::class, 'removeMember']);
        Route::apiResource('projects', ProjectController::class);

        // Milestones (scoped)
        Route::apiResource('projects/{project}/milestones', MilestoneController::class)->shallow();

        // Tasks
        Route::patch('tasks/{task}/status', [TaskController::class, 'updateStatus']);
        Route::patch('tasks/{task}/completion', [TaskController::class, 'updateCompletion']);
        Route::post('tasks/{task}/comments', [TaskController::class, 'addComment']);
        Route::get('tasks/{task}/comments', [TaskController::class, 'listComments']);
        Route::post('tasks/{task}/time-log', [TaskController::class, 'logTime']);
        Route::get('projects/{project}/tasks', [TaskController::class, 'projectTasks']);
        Route::apiResource('tasks', TaskController::class);

        // Timesheets
        Route::get('timesheets/pending', [TimesheetController::class, 'pending']);
        Route::post('timesheets/{timesheet}/submit', [TimesheetController::class, 'submit']);
        Route::post('timesheets/{timesheet}/approve', [TimesheetController::class, 'approve']);
        Route::post('timesheets/{timesheet}/reject', [TimesheetController::class, 'reject']);
        Route::get('projects/{project}/timesheets', [TimesheetController::class, 'projectTimesheets']);
        Route::apiResource('timesheets', TimesheetController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

        // ─── Payroll & Expense Management Sprint 6 ──────────────
        Route::post('payroll/runs/{payroll_run}/approve', [PayrollRunController::class, 'approve'])->name('payroll.runs.approve');
        Route::get('payroll/cost-allocation', [PayrollRunController::class, 'costAllocation'])->name('payroll.cost-allocation');
        Route::apiResource('payroll/runs', PayrollRunController::class)->only(['index', 'store', 'show']);

        Route::post('expenses/{expense}/approve', [ExpenseController::class, 'approve'])->name('expenses.approve');
        Route::apiResource('expenses', ExpenseController::class);

        Route::apiResource('vendors', VendorController::class);

        // ─── Reports & Analytics (Sprint 8A) ─────────────────────────
        Route::prefix('reports')
            ->name('reports.')
            ->group(function () {
                Route::get('revenue',        [ReportController::class, 'revenueSummary'])->name('revenue');
                Route::get('pipeline',       [ReportController::class, 'salesPipeline'])->name('pipeline');
                Route::get('quotes',         [ReportController::class, 'quoteConversion'])->name('quotes');
                Route::get('profitability',  [ReportController::class, 'projectProfitability'])->name('profitability');
                Route::get('utilisation',    [ReportController::class, 'teamUtilisation'])->name('utilisation');
                Route::get('expenses',       [ReportController::class, 'expenseBreakdown'])->name('expenses');
                Route::get('payroll',        [ReportController::class, 'payrollSummary'])->name('payroll');
                Route::get('clients',        [ReportController::class, 'clientSummary'])->name('clients');
            });

        // ─── Settings, Auditing, & Backups (Sprint 8B) ────────────────
        Route::prefix('settings')
            ->name('settings.')
            ->group(function () {
                Route::get('/',                    [SettingController::class, 'index'])->name('index');
                Route::put('company',             [SettingController::class, 'updateCompany'])->name('company');
                Route::put('tax',                 [SettingController::class, 'updateTax'])->name('tax');
                Route::put('number-sequences',    [SettingController::class, 'updateNumberSequences'])->name('number-sequences');
                Route::put('currencies',          [SettingController::class, 'updateCurrencies'])->name('currencies');
            });

        Route::get('audit-logs',                  [AuditLogController::class, 'index'])->name('audit-logs.index');

        Route::prefix('backups')
            ->name('backups.')
            ->group(function () {
                Route::get('/',                   [BackupController::class, 'index'])->name('index');
                Route::post('/',                  [BackupController::class, 'store'])->name('store');
                Route::delete('{filename}',       [BackupController::class, 'destroy'])->name('destroy');
                Route::post('{filename}/restore', [BackupController::class, 'restore'])->name('restore');
            });
    });

    // ─── Client Portal Sprint 7 ───────────────────────────────────────────────
    // Public portal login (no auth required)
    Route::post('portal/login', [PortalController::class, 'login'])
        ->name('portal.login')
        ->middleware('throttle:login');

    // Authenticated portal endpoints (client role enforced inside controller)
    Route::middleware(['auth:sanctum', 'throttle:api'])
        ->prefix('portal')
        ->name('portal.')
        ->group(function () {
            Route::get('projects',                  [PortalController::class, 'projects'])->name('projects.index');
            Route::get('projects/{project}',        [PortalController::class, 'projectShow'])->name('projects.show');
            Route::get('projects/{project}/tasks',  [PortalController::class, 'projectTasks'])->name('projects.tasks');
            Route::get('invoices',                  [PortalController::class, 'invoices'])->name('invoices.index');
        });
});
