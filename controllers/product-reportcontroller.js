<?php
session_start([
    'cookie_lifetime' => 86400,
    'cookie_secure'   => true,
    'cookie_httponly' => true,
    'use_strict_mode' => true,
    'sid_length'      => 48,
]);

include('config.php'); // Includes database connection


// Check if username is set in session
if (!isset($_SESSION["username"])) {
    exit("Error: No username found in session.");
}

$username = htmlspecialchars($_SESSION["username"]);

// Retrieve user information from the users table
$user_query = "SELECT username, email, date FROM users WHERE username = :username";
$stmt = $connection->prepare($user_query);
$stmt->bindParam(':username', $username);
$stmt->execute();
$user_info = $stmt->fetch(PDO::FETCH_ASSOC);


if (!$user_info) {
    exit("Error: User not found.");
}

// Retrieve user email and registration date
$email = htmlspecialchars($user_info['email']);
$date = htmlspecialchars($user_info['date']);

// Calculate metrics for each product
$product_metrics_query = "
    SELECT 
        products.id AS product_id,
        products.name AS product_name,
        SUM(sales.sales_qty) AS total_quantity,
        SUM(sales.sales_qty * products.price) AS total_sales,
        SUM(sales.sales_qty * products.cost) AS total_cost,
        SUM(sales.sales_qty * (products.price - products.cost)) AS total_profit,
        SUM(sales.sales_qty) / NULLIF(SUM(products.stock_qty), 0) AS inventory_turnover_rate, -- Adding inventory turnover rate
        (SUM(products.price) / NULLIF(SUM(products.cost), 0)) * 100 AS sell_through_rate -- Adding sell-through rate
    FROM sales
    INNER JOIN products ON sales.product_id = products.id
    GROUP BY products.id";
$stmt = $connection->query($product_metrics_query);
$product_metrics_data = $stmt->fetchAll(PDO::FETCH_ASSOC);



// Initialize metrics for the entire report
$total_sales = 0;
$total_quantity = 0;
$total_profit = 0;
$total_cost = 0;

foreach ($product_metrics_data as $product) {
    $total_sales += $product['total_sales'];
    $total_quantity += $product['total_quantity'];
    $total_profit += $product['total_profit'];
    $total_cost += $product['total_cost'];
}

// Ensure total expenses are calculated correctly
$total_expenses = $total_cost;

// Additional calculations
$gross_margin = ($total_sales > 0) ? $total_sales - $total_expenses : 0;
$net_margin = ($total_sales > 0) ? $total_profit - $total_expenses : 0;
$profit_margin = ($total_sales > 0) ? ($total_profit / $total_sales) * 100 : 0;
$inventory_turnover_rate = ($total_quantity > 0) ? ($total_cost / ($total_cost / 2)) : 0;
$stock_to_sales_ratio = ($total_sales > 0) ? ($total_quantity / $total_sales) * 100 : 0;
$sell_through_rate = ($total_quantity > 0) ? ($total_sales / $total_quantity) / 100 : 0;

// Encode revenue by product as JSON
$revenue_by_product = json_encode($product_metrics_data);

// Check if a report for the current date already exists
$report_date = date('Y-m-d');
$check_report_query = "SELECT reports_id FROM reports WHERE report_date = :report_date";
$stmt = $connection->prepare($check_report_query);
$stmt->execute([':report_date' => $report_date]);
$existing_report = $stmt->fetch(PDO::FETCH_ASSOC);


if ($existing_report) {
    // Update existing report
    $update_query = "
        UPDATE reports
        SET 
            revenue = :revenue,
            profit_margin = :profit_margin,
            revenue_by_product = :revenue_by_product,
            gross_margin = :gross_margin,
            net_margin = :net_margin,
            inventory_turnover_rate = :inventory_turnover_rate,
            stock_to_sales_ratio = :stock_to_sales_ratio,
            sell_through_rate = :sell_through_rate,
            total_sales = :total_sales,
            total_quantity = :total_quantity,
            total_profit = :total_profit,
            total_expenses = :total_expenses,
            net_profit = :net_profit
        WHERE reports_id = :reports_id";
    $stmt = $connection->prepare($update_query);
    $stmt->execute([
        ':revenue' => $total_sales,
        ':profit_margin' => $profit_margin,
        ':revenue_by_product' => $revenue_by_product,
        ':gross_margin' => $gross_margin,
        ':net_margin' => $net_margin,
        ':inventory_turnover_rate' => $inventory_turnover_rate,
        ':stock_to_sales_ratio' => $stock_to_sales_ratio,
        ':sell_through_rate' => $sell_through_rate,
        ':total_sales' => $total_sales,
        ':total_quantity' => $total_quantity,
        ':total_profit' => $total_profit,
        ':total_expenses' => $total_expenses,
        ':net_profit' => $net_margin,  // This should be net margin, which is profit - expenses
        ':reports_id' => $existing_report['reports_id']
    ]);
} else {
    // Insert new report
    $insert_query = "
        INSERT INTO reports (
            report_date, revenue, profit_margin, revenue_by_product, gross_margin,
            net_margin, inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate,
            total_sales, total_quantity, total_profit, total_expenses, net_profit
        ) VALUES (
            :report_date, :revenue, :profit_margin, :revenue_by_product, :gross_margin,
            :net_margin, :inventory_turnover_rate, :stock_to_sales_ratio, :sell_through_rate,
            :total_sales, :total_quantity, :total_profit, :total_expenses, :net_profit
        )";
    $stmt = $connection->prepare($insert_query);
    $stmt->execute([
        ':report_date' => $report_date,
        ':revenue' => $total_sales,
        ':profit_margin' => $profit_margin,
        ':revenue_by_product' => $revenue_by_product,
        ':gross_margin' => $gross_margin,
        ':net_margin' => $net_margin,
        ':inventory_turnover_rate' => $inventory_turnover_rate,
        ':stock_to_sales_ratio' => $stock_to_sales_ratio,
        ':sell_through_rate' => $sell_through_rate,
        ':total_sales' => $total_sales,
        ':total_quantity' => $total_quantity,
        ':total_profit' => $total_profit,
        ':total_expenses' => $total_expenses,
        ':net_profit' => $net_margin  // This should be net margin, which is profit - expenses
    ]);
}


// Fetch metrics data from the `reports` table for the current date
$metrics_query = "SELECT * FROM reports WHERE report_date = :report_date";
$stmt = $connection->prepare($metrics_query);
$stmt->execute([':report_date' => $report_date]);
$metrics_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

