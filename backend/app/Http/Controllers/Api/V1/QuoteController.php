<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\QuoteResource;
use App\Models\DiscountCoupon;
use App\Models\Quote;
use App\Models\QuoteApproval;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class QuoteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse|AnonymousResourceCollection
    {
        $user = $request->user();
        if (!$user->isFounder() && !$user->hasPermissionTo('quotes.view_all')) {
            if ($user->hasPermissionTo('quotes.view')) {
                // Limit to own quotes or leads assigned to them
                $query = Quote::where(function ($q) use ($user) {
                    $q->where('created_by', $user->id)
                      ->orWhereHas('lead', function ($ql) use ($user) {
                          $ql->where('sales_exec_id', $user->id)
                             ->orWhere('sales_head_id', $user->id);
                      });
                });
            } else {
                return response()->json(['message' => 'This action is unauthorized.'], 403);
            }
        } else {
            $query = Quote::query();
        }

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->input('lead_id'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('quote_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $quotes = $query->with(['lead', 'creator', 'currency', 'coupon', 'items', 'approvals'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        return QuoteResource::collection($quotes);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse|QuoteResource
    {
        Gate::authorize('create', Quote::class);

        $validated = $request->validate([
            'lead_id' => ['nullable', 'exists:leads,id'],
            'client_id' => ['nullable', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'currency_id' => ['required', 'exists:currencies,id'],
            'exchange_rate' => ['nullable', 'numeric', 'min:0.0001'],
            'coupon_code' => ['nullable', 'string', 'exists:discount_coupons,code'],
            'coupon_id' => ['nullable', 'exists:discount_coupons,id'],
            'valid_until' => ['nullable', 'date'],
            'terms_conditions' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
            'client_notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.service_id' => ['nullable', 'exists:services,id'],
            'items.*.description' => ['required', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit' => ['nullable', 'string', 'max:50'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.sort_order' => ['nullable', 'integer'],
        ]);

        $quote = DB::transaction(function () use ($validated, $request) {
            // Recompute totals
            $subtotal = 0.00;
            $itemsDiscount = 0.00;
            $itemsTax = 0.00;
            $calculatedItems = [];

            foreach ($validated['items'] as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['unit_price'] ?? 0);
                $discPercent = (float) ($item['discount_percent'] ?? 0);
                $taxRate = (float) ($item['tax_rate'] ?? 0);

                $itemSubtotal = $qty * $price;
                $itemDiscount = $itemSubtotal * ($discPercent / 100);
                $itemTaxable = $itemSubtotal - $itemDiscount;
                $itemTax = $itemTaxable * ($taxRate / 100);
                $itemTotal = $itemTaxable + $itemTax;

                $subtotal += $itemSubtotal;
                $itemsDiscount += $itemDiscount;
                $itemsTax += $itemTax;

                $calculatedItems[] = [
                    'service_id' => $item['service_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $qty,
                    'unit' => $item['unit'] ?? null,
                    'unit_price' => $price,
                    'discount_percent' => $discPercent,
                    'discount_amount' => $itemDiscount,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $itemTax,
                    'total_amount' => $itemTotal,
                    'sort_order' => $item['sort_order'] ?? 0,
                ];
            }

            // Coupon validation & calculations
            $couponId = null;
            $couponDiscount = 0.00;

            $code = $validated['coupon_code'] ?? null;
            $cId = $validated['coupon_id'] ?? null;

            $coupon = null;
            if ($code) {
                $coupon = DiscountCoupon::where('code', $code)->first();
            } elseif ($cId) {
                $coupon = DiscountCoupon::find($cId);
            }

            if ($coupon && $coupon->isValidForAmount($subtotal - $itemsDiscount)) {
                $couponId = $coupon->id;
                if ($coupon->type === 'percentage') {
                    $couponDiscount = ($subtotal - $itemsDiscount) * ((float) $coupon->value / 100);
                    if ($coupon->maximum_discount !== null && $couponDiscount > (float) $coupon->maximum_discount) {
                        $couponDiscount = (float) $coupon->maximum_discount;
                    }
                } else {
                    $couponDiscount = (float) $coupon->value;
                    if ($couponDiscount > ($subtotal - $itemsDiscount)) {
                        $couponDiscount = $subtotal - $itemsDiscount;
                    }
                }
                $coupon->increment('used_count');
            }

            $discountAmount = $itemsDiscount + $couponDiscount;
            $taxAmount = $itemsTax;
            $totalAmount = $subtotal - $discountAmount + $taxAmount;

            $quote = Quote::create([
                'lead_id' => $validated['lead_id'] ?? null,
                'client_id' => $validated['client_id'] ?? null,
                'created_by' => $request->user()->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'currency_id' => $validated['currency_id'],
                'exchange_rate' => $validated['exchange_rate'] ?? 1.0000,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'coupon_id' => $couponId,
                'coupon_discount' => $couponDiscount,
                'status' => 'draft',
                'valid_until' => $validated['valid_until'] ?? null,
                'terms_conditions' => $validated['terms_conditions'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
                'client_notes' => $validated['client_notes'] ?? null,
            ]);

            foreach ($calculatedItems as $cItem) {
                $quote->items()->create($cItem);
            }

            return $quote;
        });

        return (new QuoteResource($quote->load(['lead', 'creator', 'currency', 'coupon', 'items'])))
            ->additional(['message' => 'Quote created successfully.']);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Quote $quote): JsonResponse|QuoteResource
    {
        Gate::authorize('view', $quote);

        return new QuoteResource($quote->load(['lead', 'creator', 'currency', 'coupon', 'items', 'approvals']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Quote $quote): JsonResponse|QuoteResource
    {
        Gate::authorize('update', $quote);

        $validated = $request->validate([
            'lead_id' => ['nullable', 'exists:leads,id'],
            'client_id' => ['nullable', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'currency_id' => ['required', 'exists:currencies,id'],
            'exchange_rate' => ['nullable', 'numeric', 'min:0.0001'],
            'coupon_code' => ['nullable', 'string', 'exists:discount_coupons,code'],
            'coupon_id' => ['nullable', 'exists:discount_coupons,id'],
            'valid_until' => ['nullable', 'date'],
            'terms_conditions' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
            'client_notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.service_id' => ['nullable', 'exists:services,id'],
            'items.*.description' => ['required', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit' => ['nullable', 'string', 'max:50'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.sort_order' => ['nullable', 'integer'],
        ]);

        $quote = DB::transaction(function () use ($quote, $validated) {
            // Recompute totals
            $subtotal = 0.00;
            $itemsDiscount = 0.00;
            $itemsTax = 0.00;
            $calculatedItems = [];

            foreach ($validated['items'] as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['unit_price'] ?? 0);
                $discPercent = (float) ($item['discount_percent'] ?? 0);
                $taxRate = (float) ($item['tax_rate'] ?? 0);

                $itemSubtotal = $qty * $price;
                $itemDiscount = $itemSubtotal * ($discPercent / 100);
                $itemTaxable = $itemSubtotal - $itemDiscount;
                $itemTax = $itemTaxable * ($taxRate / 100);
                $itemTotal = $itemTaxable + $itemTax;

                $subtotal += $itemSubtotal;
                $itemsDiscount += $itemDiscount;
                $itemsTax += $itemTax;

                $calculatedItems[] = [
                    'service_id' => $item['service_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $qty,
                    'unit' => $item['unit'] ?? null,
                    'unit_price' => $price,
                    'discount_percent' => $discPercent,
                    'discount_amount' => $itemDiscount,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $itemTax,
                    'total_amount' => $itemTotal,
                    'sort_order' => $item['sort_order'] ?? 0,
                ];
            }

            // Coupon validation & calculations
            $couponId = null;
            $couponDiscount = 0.00;

            $code = $validated['coupon_code'] ?? null;
            $cId = $validated['coupon_id'] ?? null;

            $coupon = null;
            if ($code) {
                $coupon = DiscountCoupon::where('code', $code)->first();
            } elseif ($cId) {
                $coupon = DiscountCoupon::find($cId);
            }

            if ($coupon && $coupon->isValidForAmount($subtotal - $itemsDiscount)) {
                $couponId = $coupon->id;
                if ($coupon->type === 'percentage') {
                    $couponDiscount = ($subtotal - $itemsDiscount) * ((float) $coupon->value / 100);
                    if ($coupon->maximum_discount !== null && $couponDiscount > (float) $coupon->maximum_discount) {
                        $couponDiscount = (float) $coupon->maximum_discount;
                    }
                } else {
                    $couponDiscount = (float) $coupon->value;
                    if ($couponDiscount > ($subtotal - $itemsDiscount)) {
                        $couponDiscount = $subtotal - $itemsDiscount;
                    }
                }

                // If coupon changed, manage counts
                if ($quote->coupon_id !== $couponId) {
                    if ($quote->coupon) {
                        $quote->coupon->decrement('used_count');
                    }
                    $coupon->increment('used_count');
                }
            } else {
                // If coupon removed
                if ($quote->coupon) {
                    $quote->coupon->decrement('used_count');
                }
            }

            $discountAmount = $itemsDiscount + $couponDiscount;
            $taxAmount = $itemsTax;
            $totalAmount = $subtotal - $discountAmount + $taxAmount;

            $quote->update([
                'lead_id' => $validated['lead_id'] ?? null,
                'client_id' => $validated['client_id'] ?? null,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'currency_id' => $validated['currency_id'],
                'exchange_rate' => $validated['exchange_rate'] ?? 1.0000,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'coupon_id' => $couponId,
                'coupon_discount' => $couponDiscount,
                'valid_until' => $validated['valid_until'] ?? null,
                'terms_conditions' => $validated['terms_conditions'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
                'client_notes' => $validated['client_notes'] ?? null,
            ]);

            // Recreate items
            $quote->items()->delete();
            foreach ($calculatedItems as $cItem) {
                $quote->items()->create($cItem);
            }

            return $quote;
        });

        return (new QuoteResource($quote->load(['lead', 'creator', 'currency', 'coupon', 'items'])))
            ->additional(['message' => 'Quote updated successfully.']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Quote $quote): JsonResponse
    {
        Gate::authorize('delete', $quote);

        if ($quote->coupon) {
            $quote->coupon->decrement('used_count');
        }

        $quote->delete();

        return response()->json([
            'message' => 'Quote deleted successfully.',
        ]);
    }

    /**
     * Submit a quote for approval.
     */
    public function submitApproval(Request $request, int $id): JsonResponse
    {
        $quote = Quote::findOrFail($id);

        // Can only submit draft or rejected quotes
        if (!in_array($quote->status, ['draft', 'rejected'], true)) {
            return response()->json([
                'message' => 'Only draft or rejected quotes can be submitted for approval.',
            ], 422);
        }

        // Must be quote owner or founder/sales head
        $user = $request->user();
        if ($quote->created_by !== $user->id && !$user->isFounder() && !$user->hasRole('sales_head')) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        DB::transaction(function () use ($quote, $user) {
            // Create pending QuoteApproval entry
            QuoteApproval::create([
                'quote_id' => $quote->id,
                'requested_by' => $user->id,
                'approver_id' => null,
                'step_number' => 1,
                'status' => 'pending',
            ]);

            // Update status
            $quote->update([
                'status' => 'pending_approval',
            ]);
        });

        return response()->json([
            'message' => 'Quote submitted for approval successfully.',
            'quote' => new QuoteResource($quote->fresh(['lead', 'creator', 'currency', 'coupon', 'items', 'approvals'])),
        ]);
    }

    /**
     * Approve a quote.
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $quote = Quote::findOrFail($id);

        Gate::authorize('approve', $quote);

        if ($quote->status !== 'pending_approval') {
            return response()->json([
                'message' => 'Only quotes pending approval can be approved.',
            ], 422);
        }

        $user = $request->user();

        DB::transaction(function () use ($quote, $user, $request) {
            $approval = $quote->approvals()->where('status', 'pending')->latest()->first();
            if ($approval) {
                $approval->update([
                    'status' => 'approved',
                    'approver_id' => $user->id,
                    'comments' => $request->input('comments'),
                    'actioned_at' => now(),
                ]);
            } else {
                $quote->approvals()->create([
                    'requested_by' => $quote->created_by,
                    'approver_id' => $user->id,
                    'status' => 'approved',
                    'comments' => $request->input('comments'),
                    'actioned_at' => now(),
                ]);
            }

            $quote->update([
                'status' => 'approved',
            ]);
        });

        return response()->json([
            'message' => 'Quote approved successfully.',
            'quote' => new QuoteResource($quote->fresh(['lead', 'creator', 'currency', 'coupon', 'items', 'approvals'])),
        ]);
    }

    /**
     * Reject a quote.
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $quote = Quote::findOrFail($id);

        Gate::authorize('approve', $quote);

        if ($quote->status !== 'pending_approval') {
            return response()->json([
                'message' => 'Only quotes pending approval can be rejected.',
            ], 422);
        }

        $request->validate([
            'comments' => ['required', 'string', 'min:3'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($quote, $user, $request) {
            $approval = $quote->approvals()->where('status', 'pending')->latest()->first();
            if ($approval) {
                $approval->update([
                    'status' => 'rejected',
                    'approver_id' => $user->id,
                    'comments' => $request->input('comments'),
                    'actioned_at' => now(),
                ]);
            } else {
                $quote->approvals()->create([
                    'requested_by' => $quote->created_by,
                    'approver_id' => $user->id,
                    'status' => 'rejected',
                    'comments' => $request->input('comments'),
                    'actioned_at' => now(),
                ]);
            }

            $quote->update([
                'status' => 'rejected',
            ]);
        });

        return response()->json([
            'message' => 'Quote rejected successfully.',
            'quote' => new QuoteResource($quote->fresh(['lead', 'creator', 'currency', 'coupon', 'items', 'approvals'])),
        ]);
    }

    /**
     * Generate HTML or mock PDF printout.
     */
    public function generatePdf(Request $request, int $id)
    {
        $quote = Quote::with(['lead', 'creator', 'currency', 'coupon', 'items'])->findOrFail($id);

        Gate::authorize('view', $quote);

        // Return a beautifully styled HTML printout
        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Quote #{$quote->quote_number} - {$quote->title}</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #4F46E5; }
        .quote-info { text-align: right; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .details-block h3 { margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; color: #4B5563; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #F9FAFB; border-bottom: 2px solid #E5E7EB; text-align: left; padding: 12px; font-weight: 600; color: #374151; }
        td { border-bottom: 1px solid #E5E7EB; padding: 12px; }
        .text-right { text-align: right; }
        .totals { margin-left: auto; width: 300px; }
        .totals table { margin-bottom: 0; }
        .totals td { border: none; padding: 6px 12px; }
        .totals tr.grand-total td { font-weight: bold; border-top: 1px solid #E5E7EB; color: #4F46E5; font-size: 18px; }
        .notes-section { border-top: 1px solid #eee; margin-top: 40px; padding-top: 20px; font-size: 14px; color: #6B7280; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">CREATIVALS</div>
        <div class="quote-info">
            <h2>QUOTATION</h2>
            <strong>Quote Number:</strong> {$quote->quote_number}<br>
            <strong>Date:</strong> {$quote->created_at->toDateString()}<br>
            <strong>Valid Until:</strong> {$quote->valid_until?->toDateString()}
        </div>
    </div>

    <div class="details-grid">
        <div class="details-block">
            <h3>Prepared By</h3>
            <strong>{$quote->creator?->name}</strong><br>
            {$quote->creator?->email}
        </div>
        <div class="details-block">
            <h3>Prepared For</h3>
            <strong>{$quote->lead?->company_name}</strong><br>
            Lead Ref: {$quote->lead?->lead_number}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Service / Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Tax Rate</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
HTML;

        foreach ($quote->items as $item) {
            $currencySymbol = $quote->currency?->symbol ?? '$';
            $disc = $item->discount_percent > 0 ? "{$item->discount_percent}%" : '-';
            $tax = $item->tax_rate > 0 ? "{$item->tax_rate}%" : '-';
            $html .= <<<HTML
            <tr>
                <td><strong>{$item->description}</strong></td>
                <td class="text-right">{$item->quantity}</td>
                <td class="text-right">{$currencySymbol}{$item->unit_price}</td>
                <td class="text-right">{$disc}</td>
                <td class="text-right">{$tax}</td>
                <td class="text-right">{$currencySymbol}{$item->total_amount}</td>
            </tr>
HTML;
        }

        $currencySymbol = $quote->currency?->symbol ?? '$';
        $html .= <<<HTML
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td class="text-right">{$currencySymbol}{$quote->subtotal}</td>
            </tr>
            <tr>
                <td>Discount:</td>
                <td class="text-right">-{$currencySymbol}{$quote->discount_amount}</td>
            </tr>
            <tr>
                <td>Tax:</td>
                <td class="text-right">{$currencySymbol}{$quote->tax_amount}</td>
            </tr>
            <tr class="grand-total">
                <td>Total:</td>
                <td class="text-right">{$currencySymbol}{$quote->total_amount}</td>
            </tr>
        </table>
    </div>

    <div class="notes-section">
        <h3>Terms & Conditions</h3>
        <p>{$quote->terms_conditions}</p>
        
        <h3>Notes</h3>
        <p>{$quote->client_notes}</p>
    </div>
</body>
</html>
HTML;

        return response($html, 200, [
            'Content-Type' => 'text/html',
            'Content-Disposition' => 'inline; filename="quote_' . $quote->quote_number . '.html"',
        ]);
    }
}
