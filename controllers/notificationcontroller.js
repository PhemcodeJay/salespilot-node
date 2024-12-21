const fetchInventoryNotifications = async (req, res) => {
    try {
        const lowStock = 10;
        const highStock = 1000;

        const inventoryQuery = `
            SELECT i.product_name, i.available_stock, i.inventory_qty, i.sales_qty, p.image_path
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.available_stock < ? OR i.available_stock > ?
            ORDER BY i.last_updated DESC
        `;
        const [inventoryNotifications] = await connection.execute(inventoryQuery, [lowStock, highStock]);

        res.status(200).json({ inventoryNotifications });
    } catch (error) {
        console.error("Error fetching inventory notifications:", error);
        res.status(500).json({ error: "Database Error: Unable to fetch inventory notifications" });
    }
};

const fetchReportsNotifications = async (req, res) => {
    try {
        const highRevenue = 10000;
        const lowRevenue = 1000;

        const reportsQuery = `
            SELECT JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_name')) AS product_name, 
                   JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) AS revenue,
                   p.image_path
            FROM reports r
            JOIN products p ON JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_id')) = p.id
            WHERE JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) > ? 
               OR JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) < ?
            ORDER BY r.report_date DESC
        `;
        const [reportsNotifications] = await connection.execute(reportsQuery, [highRevenue, lowRevenue]);

        res.status(200).json({ reportsNotifications });
    } catch (error) {
        console.error("Error fetching reports notifications:", error);
        res.status(500).json({ error: "Database Error: Unable to fetch reports notifications" });
    }
};

module.exports = {
    fetchInventoryNotifications,
    fetchReportsNotifications,
};
