<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use App\Models\Currency;
use App\Models\NumberSequence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class SettingController extends Controller
{
    /**
     * Get all general settings, currencies, and number sequences.
     * GET /api/v1/settings
     */
    public function index(): JsonResponse
    {
        $settings = CompanySetting::all()->pluck('value', 'key');
        $currencies = Currency::all();
        $numberSequences = NumberSequence::all();

        return response()->json([
            'data' => [
                'company' => [
                    'company_name' => $settings->get('company_name', 'Creativals Digital Marketing Agency'),
                    'company_email' => $settings->get('company_email', 'hello@creativals.com'),
                    'company_phone' => $settings->get('company_phone', '+91 98765 43210'),
                    'company_address' => $settings->get('company_address', 'Mumbai, Maharashtra, India'),
                    'timezone' => $settings->get('timezone', 'Asia/Kolkata'),
                ],
                'tax' => [
                    'default_tax_rate' => $settings->get('default_tax_rate', '18'),
                ],
                'currencies' => $currencies,
                'number_sequences' => $numberSequences,
            ],
            'message' => 'Settings retrieved successfully.',
        ]);
    }

    /**
     * Update company profile information.
     * PUT /api/v1/settings/company
     */
    public function updateCompany(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'company_email' => ['required', 'email', 'max:255'],
            'company_phone' => ['required', 'string', 'max:50'],
            'company_address' => ['required', 'string', 'max:1000'],
            'timezone' => ['required', 'string', 'max:100'],
        ]);

        foreach ($validated as $key => $val) {
            CompanySetting::setValue($key, $val, 'general');
        }

        return response()->json([
            'message' => 'Company profile updated successfully.',
        ]);
    }

    /**
     * Update tax defaults settings.
     * PUT /api/v1/settings/tax
     */
    public function updateTax(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'default_tax_rate' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        CompanySetting::setValue('default_tax_rate', (string) $validated['default_tax_rate'], 'tax');

        return response()->json([
            'message' => 'Tax settings updated successfully.',
        ]);
    }

    /**
     * Update number sequence templates.
     * PUT /api/v1/settings/number-sequences
     */
    public function updateNumberSequences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sequences' => ['required', 'array'],
            'sequences.*.entity_type' => ['required', 'string'],
            'sequences.*.prefix' => ['required', 'string', 'max:20'],
            'sequences.*.current_number' => ['required', 'integer', 'min:0'],
            'sequences.*.padding_length' => ['required', 'integer', 'min:1', 'max:10'],
            'sequences.*.format' => ['required', 'string', 'max:50'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['sequences'] as $seqData) {
                NumberSequence::updateOrCreate(
                    ['entity_type' => $seqData['entity_type']],
                    [
                        'prefix' => $seqData['prefix'],
                        'current_number' => $seqData['current_number'],
                        'padding_length' => $seqData['padding_length'],
                        'format' => $seqData['format'],
                    ]
                );
            }
        });

        return response()->json([
            'message' => 'Number sequences updated successfully.',
        ]);
    }

    /**
     * Update currencies active status and default selection.
     * PUT /api/v1/settings/currencies
     */
    public function updateCurrencies(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'default_currency_code' => ['required', 'string', 'exists:currencies,code'],
            'active_currency_codes' => ['required', 'array'],
            'active_currency_codes.*' => ['required', 'string', 'exists:currencies,code'],
        ]);

        $defaultCode = $validated['default_currency_code'];
        $activeCodes = $validated['active_currency_codes'];

        // Enforce that default currency must be in the active array
        if (!in_array($defaultCode, $activeCodes, true)) {
            $activeCodes[] = $defaultCode;
        }

        DB::transaction(function () use ($defaultCode, $activeCodes) {
            // Deactivate all first
            Currency::query()->update(['is_active' => false, 'is_default' => false]);

            // Activate active ones
            Currency::whereIn('code', $activeCodes)->update(['is_active' => true]);

            // Set default
            Currency::where('code', $defaultCode)->update(['is_default' => true]);

            // Set company settings default currency key too
            CompanySetting::setValue('default_currency', $defaultCode, 'currency');
        });

        return response()->json([
            'message' => 'Currency settings updated successfully.',
        ]);
    }
}
