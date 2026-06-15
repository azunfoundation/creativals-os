<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

$client = App\Models\User::where('name', 'like', '%Acme%')->first();
if ($client) {
    echo "Client ID: " . $client->id . ", Name: " . $client->name . "\n";
    $invoices = App\Models\Invoice::where('client_id', $client->id)->get();
    foreach ($invoices as $inv) {
        echo "Invoice ID: " . $inv->id . ", Status: " . $inv->status . ", Total: " . $inv->total_amount . ", Paid: " . $inv->paid_amount . ", Due: " . $inv->due_amount . ", ExRate: " . $inv->exchange_rate . "\n";
    }
} else {
    echo "Client not found.\n";
}
