<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payslip</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Payslip</h2>
        <p>Period: {{ $item->payrollRun->month }}/{{ $item->payrollRun->year }}</p>
    </div>
    
    <table>
        <tr>
            <th>Employee</th>
            <td>{{ $item->user->name }}</td>
            <th>Email</th>
            <td>{{ $item->user->email }}</td>
        </tr>
    </table>

    <table>
        <tr>
            <th>Description</th>
            <th>Amount</th>
        </tr>
        <tr>
            <td>Base Salary</td>
            <td>{{ $item->base_salary }}</td>
        </tr>
        <tr>
            <td>Bonus</td>
            <td>{{ $item->bonus_amount }}</td>
        </tr>
        <tr>
            <td>Deductions</td>
            <td>{{ $item->deductions }}</td>
        </tr>
        <tr>
            <th>Net Salary</th>
            <th>{{ $item->net_salary }}</th>
        </tr>
    </table>
</body>
</html>
