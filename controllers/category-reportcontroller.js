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

// Calculate metrics for each product category
$sales_category_query = "
    SELECT 
        categories.category_name AS category_name,
        COUNT(products.id) AS num_products,
        SUM(sales.sales_qty * products.price) AS total_sales,
        SUM(sales.sales_qty) AS total_quantity,
        SUM(sales.sales_qty * (products.price - products.cost)) AS total_profit,
        SUM(sales.sales_qty * products.cost) AS total_expenses,
        (SUM(products.price) / NULLIF(SUM(products.cost), 0)) * 100 AS sell_through_rate -- Adding sell-through rate
    FROM products
    INNER JOIN categories ON products.category_id = categories.category_id
    LEFT JOIN sales ON sales.product_id = products.id
    GROUP BY categories.category_name";
$stmt = $connection->query($sales_category_query);
$sales_category_data = $stmt->fetchAll(PDO::FETCH_ASSOC);



// Initialize metrics for the entire report
$total_sales = 0;
$total_quantity = 0;
$total_profit = 0;

foreach ($sales_category_data as $category) {
    $total_sales += $category['total_sales'];
    $total_quantity += $category['total_quantity'];
    $total_profit += $category['total_profit'];
}


// Additional calculations for the report table
$revenue_by_category = json_encode($sales_category_data);
$gross_margin = $total_sales - $total_profit;
$net_margin = $total_profit;  // Assuming total profit represents net margin
$inventory_turnover_rate = ($total_quantity > 0) ? ($total_sales / $total_quantity) : 0;
$stock_to_sales_ratio = ($total_sales > 0) ? ($total_quantity / $total_sales) * 100 : 0;
$sell_through_rate = ($total_quantity > 0) ? ($total_sales / $total_quantity) / 100 : 0;

// Fetch previous year's revenue for year-over-year growth calculation
$previous_year_date = date('Y-m-d', strtotime($date . ' -1 year'));
$previous_year_revenue_query = "
    SELECT revenue FROM sales_analytics WHERE date = :previous_year_date";
$stmt = $connection->prepare($previous_year_revenue_query);
$stmt->bindParam(':previous_year_date', $previous_year_date);
$stmt->execute();
$previous_year_data = $stmt->fetch(PDO::FETCH_ASSOC);

$previous_year_revenue = $previous_year_data ? $previous_year_data['revenue'] : 0;

// Calculate Year-Over-Year Growth
$year_over_year_growth = ($previous_year_revenue > 0) ? 
    (($total_sales - $previous_year_revenue) / $previous_year_revenue) * 100 : 0;

// Check if a report for the current date already exists
$check_report_query = "SELECT id FROM sales_analytics WHERE date = :date";
$stmt = $connection->prepare($check_report_query);
$stmt->bindParam(':date', $date);
$stmt->execute();
$existing_report = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing_report) {
    // Update existing report
    $update_query = "
        UPDATE sales_analytics
        SET 
            revenue = :revenue,
            profit_margin = :profit_margin,
            revenue_by_category = :revenue_by_category,
            year_over_year_growth = :year_over_year_growth,
            inventory_turnover_rate = :inventory_turnover_rate,
            stock_to_sales_ratio = :stock_to_sales_ratio,
            sell_through_rate = :sell_through_rate,
            gross_margin = :gross_margin,
            net_margin = :net_margin,
            total_sales = :total_sales,
            total_quantity = :total_quantity,
            total_profit = :total_profit
        WHERE id = :id";
    $stmt = $connection->prepare($update_query);
    $stmt->execute([
        ':revenue' => $total_sales,
        ':profit_margin' => ($total_sales > 0) ? ($total_profit / $total_sales) * 100 : 0,
        ':revenue_by_category' => $revenue_by_category,
        ':year_over_year_growth' => $year_over_year_growth,
        ':inventory_turnover_rate' => $inventory_turnover_rate,
        ':stock_to_sales_ratio' => $stock_to_sales_ratio,
        ':sell_through_rate' => $sell_through_rate,
        ':gross_margin' => $gross_margin,
        ':net_margin' => $net_margin,
        ':total_sales' => $total_sales,
        ':total_quantity' => $total_quantity,
        ':total_profit' => $total_profit,
        ':id' => $existing_report['id']
    ]);
} else {
    // Insert new report
    $insert_query = "
        INSERT INTO sales_analytics (
            date, revenue, profit_margin, revenue_by_category, year_over_year_growth,
            inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate,
            gross_margin, net_margin, total_sales, total_quantity, total_profit
        ) VALUES (
            :date, :revenue, :profit_margin, :revenue_by_category, :year_over_year_growth,
            :inventory_turnover_rate, :stock_to_sales_ratio, :sell_through_rate,
            :gross_margin, :net_margin, :total_sales, :total_quantity, :total_profit
        )";
    $stmt = $connection->prepare($insert_query);
    $stmt->execute([
        ':date' => $date,
        ':revenue' => $total_sales,
        ':profit_margin' => ($total_sales > 0) ? ($total_profit / $total_sales) * 100 : 0,
        ':revenue_by_category' => $revenue_by_category,
        ':year_over_year_growth' => $year_over_year_growth,
        ':inventory_turnover_rate' => $inventory_turnover_rate,
        ':stock_to_sales_ratio' => $stock_to_sales_ratio,
        ':sell_through_rate' => $sell_through_rate,
        ':gross_margin' => $gross_margin,
        ':net_margin' => $net_margin,
        ':total_sales' => $total_sales,
        ':total_quantity' => $total_quantity,
        ':total_profit' => $total_profit
    ]);
}


// Fetch metrics data from the `sales_analytics` table for all available dates
$metrics_query = "SELECT * FROM sales_analytics ORDER BY date ASC";
$stmt = $connection->prepare($metrics_query);
$stmt->execute();
$metrics_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$metrics_data) {
    exit("Error: No report data found.");
}

// Display metrics data in a table
