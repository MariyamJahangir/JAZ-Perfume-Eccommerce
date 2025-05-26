const adminModel = require('../model/adminModel')
const bcrypt = require('bcrypt')
const userModel = require('../model/userModel')
const orderModel = require('../model/orderModel')
const moment = require('moment');
const xl = require('excel4node');
const PDFDocument = require('pdfkit');



// Get Login
const loadLogin = async (req, res) => {
    res.render('admin/login')
}

// Post Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body
        // Validate input fields
        if (!email || !password) {
            return res.render('admin/login', { message: 'Email and password are required' });
        }
        const admin = await adminModel.findOne({ email })
        if (!admin) return res.render('admin/login', { message: 'No admin is found with the email' })
        const isMatch = await bcrypt.compare(password, admin.password)
        if (!isMatch) return res.render('admin/login', { message: 'Incorrect Password' })
        req.session.admin = true
        res.redirect('/admin/dashboard')
    } catch (error) {
        res.send(error)
    }
}







// Get Logout
const logout = (req, res) => {
    req.session.admin = null
    res.redirect('/admin/login')
}

// Get Homepage (dashboard)
const loadDashboard = async (req, res) => {

    try {
        const currentYear = new Date().getFullYear();

        const monthlySales = await orderModel.aggregate([
            {
                $match: {
                    orderStatus: { $in: ['Completed'] },
                    orderDate: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$orderDate" } },
                    totalSales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id.month": 1 }
            }
        ]);

        // Map month number to name and build labels/data arrays
        const monthLabels = [];
        const salesData = [];

        monthlySales.forEach(entry => {
            const monthName = moment().month(entry._id.month - 1).format("MMMM");
            monthLabels.push(monthName);
            salesData.push(entry.totalSales);
        });

        // Get sales for the current month (if available)
        const currentMonthName = moment().format("MMMM");
        const lastMonthlySalesIndex = monthLabels.indexOf(currentMonthName);
        const lastMonthlySales = lastMonthlySalesIndex !== -1 ? salesData[lastMonthlySalesIndex] : 0;


        const monthlyOrders = await orderModel.aggregate([
            { $match: { "items.status": "Delivered" } },
            { $group: { _id: { $month: "$createdAt" }, totalOrders: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        const lastMonthlyOrders = monthlyOrders.length ? monthlyOrders[monthlyOrders.length - 1].totalOrders : 0;



        const monthlyCustomers = await userModel.aggregate([
            { $group: { _id: { $month: "$createdAt" }, newCustomers: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        const monthlyCustomersData = monthlyCustomers.map(item => item.newCustomers);
        const lastMonthlyCustomers = monthlyCustomers.length ? monthlyCustomers[monthlyCustomers.length - 1].newCustomers : 0;


        const topSellingCategories = await orderModel.aggregate([
            { $unwind: '$items' },
            { $match: { 'items.status': 'Delivered' } },
            {
              $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'productInfo'
              }
            },
            { $unwind: '$productInfo' },
            {
              $group: {
                _id: '$productInfo.category',
                totalSold: { $sum: '$items.quantityCount' }
              }
            },
            {
              $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'categoryInfo'
              }
            },
            { $unwind: '$categoryInfo' },
            {
              $project: {
                categoryName: '$categoryInfo.name',
                totalSold: 1
              }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
          ]);

        const categoryLabels = topSellingCategories.map(cat => cat.categoryName);
        const categorySales = topSellingCategories.map(cat => cat.totalSold);


        res.render('admin/dashboard', {
            monthlySalesLabels: JSON.stringify(monthLabels),
            monthlySalesData: JSON.stringify(salesData),
            lastMonthlySales: lastMonthlySales.toFixed(2),
            lastMonthlyOrders,
            monthlyCustomersData: JSON.stringify(monthlyCustomersData),
            lastMonthlyCustomers,
            categoryLabels: JSON.stringify(categoryLabels),
            categorySales: JSON.stringify(categorySales),
            topSellingCategories
        });

    } catch (error) {
        console.error('Error fetching monthly sales:', error);
        res.status(500).send("Server Error");
    }


}


////////////////////////////////////////////

/**
 * Renders the sales report page.
 */
const loadSalesReport = async (req, res) => {
    try {
        const reportData = await getSalesReportData('daily');
        console.log("reportData.result:", reportData.result)
        res.status(200).render('admin/sales-report', {
            title: "Sales Report",
            orders: reportData.result,
            offerDiscounts: reportData.totalOfferDiscounts.toFixed(2),
            couponDiscounts: reportData.totalCouponDiscount.toFixed(2),
            overallSalesCount: reportData.totalSold,
            orderCount: reportData.totalSold + reportData.totalReturns,
            overallDiscount: reportData.overallDiscount.toFixed(2),
            netRevenue: reportData.netRevenue.toFixed(2)
        });
    } catch (error) {
        console.error('Error loading sales report page:', error);
        res.status(500).render('error', { message: 'Failed to load sales report' });
    }
};


/**
 * Returns sales report data based on the provided filter and date range.
 */
const getSalesReportData = async (filter, startDate, endDate) => {
    // Build match conditions using the "items" array and orderDate field
    let matchConditions = {
        "items.status": { $in: ["Delivered", "Return Approved"] }
    };

    let dateRange = {};
    const now = new Date();

    switch (filter) {
        case 'daily':
            dateRange = {
                $gte: new Date(now.setHours(0, 0, 0, 0)),
                $lte: new Date(now.setHours(23, 59, 59, 999))
            };
            break;
        case 'weekly':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
            endOfWeek.setHours(23, 59, 59, 999);

            dateRange = {
                $gte: startOfWeek,
                $lte: endOfWeek
            };
            break;
        case 'monthly':
            dateRange = {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
            };
            break;
        case 'yearly':
            dateRange = {
                $gte: new Date(now.getFullYear(), 0, 1),
                $lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
            };
            break;
        case 'custom':
            if (startDate && endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                dateRange = {
                    $gte: new Date(startDate),
                    $lte: endDateTime
                };
            }
            break;
    }

    if (Object.keys(dateRange).length > 0) {
        matchConditions.orderDate = dateRange;
    }

    // Aggregate orders using the "items" field
    const result = await orderModel.aggregate([
        { $match: matchConditions },
        { $unwind: "$items" },
        // Lookup product details from the Product collection
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },

        {
            $lookup: {
                from: "categories",
                localField: "productInfo.category",
                foreignField: "_id",
                as: "categoryInfo"
            }
        },
        { $unwind: "$categoryInfo" },




        // Retrieve the correct variant details using a filter on the product's variant array
        {
            $addFields: {
                variantInfo: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$productInfo.variant",
                                as: "v",
                                cond: { $eq: ["$$v._id", "$items.variantId"] }
                            }
                        },
                        0
                    ]
                }
            }
        },
        {
            $group: {
                _id: { productId: "$items.productId", variantId: "$items.variantId" },
                productName: { $first: "$productInfo.name" },
                category: { $first: "$categoryInfo.name" },             /////// category is id here
                variant: { $first: "$variantInfo.quantityML" },
                soldCount: {
                    $sum: { $cond: [{ $eq: ["$items.status", "Delivered"] }, "$items.quantityCount", 0] }
                },
                returnedCount: {
                    $sum: { $cond: [{ $eq: ["$items.status", "Return Approved"] }, "$items.quantityCount", 0] }
                },
                offerDiscounts: {
                    $sum: {
                        $cond: [
                            { $gt: ["$items.quantityCount", 0] },
                            { $divide: ["$items.offerDiscount", "$items.quantityCount"] },
                            0
                        ]
                    }
                },
                revenue: {
                    $sum: {
                        $cond: [
                            { $eq: ["$items.status", "Delivered"] },
                            {
                                $subtract: [
                                    {
                                        $multiply: [
                                            { $ifNull: ["$variantInfo.price", "$items.basePrice"] },
                                            "$items.quantityCount"
                                        ]
                                    },
                                    { $ifNull: ["$items.offerDiscount", 0] }
                                ]
                            },
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                productName: 1,
                category: 1,
                variant: 1,
                soldCount: 1,
                returnedCount: 1,
                offerDiscounts: 1,
                revenue: 1
            }
        }
    ]);

    // Compute overall totals
    let totalRevenue = 0;
    let totalSold = 0;
    let totalReturns = 0;
    let totalOfferDiscounts = 0;
    result.forEach((item) => {
        totalRevenue += item.revenue - item.offerDiscounts;
        totalSold += item.soldCount;
        totalReturns += item.returnedCount;
        totalOfferDiscounts += item.offerDiscounts;
    });

    // Aggregate coupon discounts at the order level (using couponDiscount from the order)
    const couponDiscounts = await orderModel.aggregate([
        { $match: matchConditions },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$_id",
                totalCoupon: { $first: "$couponDiscount" },
                totalProducts: { $sum: "$items.quantityCount" },
                returnedProducts: {
                    $sum: {
                        $cond: [{ $eq: ["$items.status", "Return Approved"] }, "$items.quantityCount", 0]
                    }
                }
            }
        },
        {
            $project: {
                totalCoupon: 1,
                nonReturnedPercentage: {
                    $cond: [
                        { $eq: ["$totalProducts", 0] },
                        1,
                        { $subtract: [1, { $divide: ["$returnedProducts", "$totalProducts"] }] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                couponDiscount: {
                    $sum: { $multiply: ["$totalCoupon", "$nonReturnedPercentage"] }
                }
            }
        }
    ]);

    const totalCouponDiscount = couponDiscounts[0]?.couponDiscount || 0;

    return {
        result,
        totalRevenue,
        totalSold,
        totalReturns,
        totalOfferDiscounts,
        totalCouponDiscount,
        overallDiscount: totalOfferDiscounts + totalCouponDiscount,
        netRevenue: totalRevenue - (totalOfferDiscounts + totalCouponDiscount)
    };
};

/**
 * Returns a date range text based on the provided filter.
 */
const getDateRangeText = (filter, startDate, endDate) => {
    switch (filter) {
        case 'daily':
            return `Date: ${new Date().toLocaleDateString()}`;
        case 'weekly':
            return `Week: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
        case 'monthly':
            return `Month: ${new Date(startDate).toLocaleString('default', { month: 'long', year: 'numeric' })}`;
        case 'yearly':
            return `Year: ${new Date().getFullYear()}`;
        case 'custom':
            return `Custom Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
        default:
            return 'Sales Report';
    }
};

/**
 * Returns sales report JSON data.
 */
const getSalesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        
        const reportData = await getSalesReportData(filter, startDate, endDate);
        res.status(200).json(reportData);
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};



/**
 * Generates an Excel sales report and sends it as a download.
 */
const generateExcel = async (reportData, res, filter, startDate, endDate) => {
    try {
        const wb = new xl.Workbook();
        const ws = wb.addWorksheet('Sales Report');

        const headerStyle = wb.createStyle({
            font: { bold: true, color: 'FFFFFF', size: 12 },
            fill: { type: 'pattern', patternType: 'solid', fgColor: '4F81BD' },
            alignment: { horizontal: 'center', vertical: 'center' }
        });

        const moneyStyle = wb.createStyle({
            numberFormat: '₹#,##0.00; (₹#,##0.00)',
            alignment: { horizontal: 'right' }
        });

        const boldStyle = wb.createStyle({
            font: { bold: true },
            alignment: { horizontal: 'left' }
        });

        // Set column widths
        ws.column(1).setWidth(40);
        ws.column(2).setWidth(20);
        ws.column(3).setWidth(15);
        ws.column(4).setWidth(15);
        ws.column(5).setWidth(15);
        ws.column(6).setWidth(20);
        ws.column(7).setWidth(20);

        // Report Title
        ws.cell(1, 1).string('Sales Report').style(boldStyle);
        ws.cell(2, 1).string(getDateRangeText(filter, startDate, endDate)).style(boldStyle);

        // Headers
        ws.cell(4, 1).string('Product Name').style(headerStyle);
        ws.cell(4, 2).string('Category').style(headerStyle);
        ws.cell(4, 3).string('Variant').style(headerStyle);
        ws.cell(4, 4).string('Sold').style(headerStyle);
        ws.cell(4, 5).string('Returns').style(headerStyle);
        ws.cell(4, 6).string('Offer Discounts').style(headerStyle);
        ws.cell(4, 7).string('Revenue').style(headerStyle);

        // Data rows
        reportData.result.forEach((order, index) => {
            const rowIndex = index + 5;
            ws.cell(rowIndex, 1).string(order.productName || 'N/A');
            ws.cell(rowIndex, 2).string(order.category || 'N/A');
            ws.cell(rowIndex, 3).string(`${order.variant} ML` || 'N/A');
            ws.cell(rowIndex, 4).number(order.soldCount || 0);
            ws.cell(rowIndex, 5).number(order.returnedCount || 0);
            ws.cell(rowIndex, 6).number(Number(order.offerDiscounts) || 0).style(moneyStyle);
            ws.cell(rowIndex, 7).number(Number(order.revenue) || 0).style(moneyStyle);
        });

        // Summary section
        const summaryRow = reportData.result.length + 6;
        ws.cell(summaryRow, 1).string('Offer Discounts:').style(boldStyle);
        ws.cell(summaryRow, 2).number(Number(reportData.totalOfferDiscounts) || 0).style(moneyStyle);

        ws.cell(summaryRow + 1, 1).string('Coupon Discounts:').style(boldStyle);
        ws.cell(summaryRow + 1, 2).number(Number(reportData.totalCouponDiscount) || 0).style(moneyStyle);

        ws.cell(summaryRow + 2, 1).string('Overall Discount:').style(boldStyle);
        ws.cell(summaryRow + 2, 2).number(Number(reportData.overallDiscount) || 0).style(moneyStyle);

        ws.cell(summaryRow + 3, 1).string('Net Revenue:').style(boldStyle);
        ws.cell(summaryRow + 3, 2).number(Number(reportData.netRevenue) || 0).style(moneyStyle);

        // Set response headers and send the file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
        const buffer = await wb.writeToBuffer();
        res.send(buffer);
    } catch (error) {
        console.error('Excel generation error:', error);
        throw new Error('Failed to generate Excel report');
    }
};

/**
 * Generates a PDF sales report and sends it as a download.
 */
const generatePDF = async (reportData, res, filter, startDate, endDate) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${filter || 'custom'}-${new Date().toISOString().split('T')[0]}.pdf`);
        doc.pipe(res);

        doc.fontSize(25).text('Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);
        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };
        doc.text(`${getDateRangeText(filter, startDate, endDate)}`, { align: 'left' });
        doc.text(`Generated on: ${formatDate(new Date())}`, { align: 'left' });
        doc.moveDown(2);
        doc.fontSize(16).text('Summary', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Total Revenue: Rs.${reportData.totalRevenue.toFixed(2)}`);
        doc.text(`Total Products Sold: ${reportData.totalSold}`);
        doc.text(`Total Returns: ${reportData.totalReturns}`);
        doc.text(`Total Offer Discounts: Rs. ${reportData.totalOfferDiscounts.toFixed(2)}`);
        doc.text(`Total Coupon Discounts: Rs. ${reportData.totalCouponDiscount.toFixed(2)}`);
        doc.text(`Overall Discount: Rs. ${reportData.overallDiscount.toFixed(2)}`);
        doc.text(`Net Revenue: Rs. ${reportData.netRevenue.toFixed(2)}`);
        doc.moveDown(2);
        doc.fontSize(16).text('Product Details', { underline: true });
        doc.moveDown();

        const tableTop = doc.y;
        const tableColumns = [
            { title: 'Product', x: 50, width: 180 },
            { title: 'Category', x: 230, width: 100 },
            { title: 'Variant', x: 330, width: 60 },
            { title: 'Sold', x: 390, width: 60 },
            { title: 'Returns', x: 450, width: 60 },
            { title: 'Revenue', x: 510, width: 80 }
        ];

        doc.fontSize(10).font('Helvetica-Bold');
        tableColumns.forEach(column => {
            doc.text(column.title, column.x, tableTop, { width: column.width, align: 'left' });
        });

        doc.moveDown();
        const lineY = doc.y;
        doc.moveTo(50, lineY).lineTo(590, lineY).stroke();
        doc.moveDown(0.5);

        let rowY = doc.y;
        doc.font('Helvetica');
        //console.log('result:',reportData.result)
        reportData.result.forEach((item) => {
            if (rowY > 700) {
                doc.addPage();
                rowY = 50;
                doc.moveDown();
            }
            doc.text(item.productName, tableColumns[0].x, rowY, { width: tableColumns[0].width, align: 'left' });
            doc.text(item.category.toString(), tableColumns[1].x, rowY, { width: tableColumns[1].width, align: 'left' });
            doc.text(item.variant ? `${item.variant.toString()} ML` : 'N/A', tableColumns[2].x, rowY, { width: tableColumns[2].width, align: 'left' });
            doc.text(item.soldCount.toString(), tableColumns[3].x, rowY, { width: tableColumns[3].width, align: 'left' });
            doc.text(item.returnedCount.toString(), tableColumns[4].x, rowY, { width: tableColumns[4].width, align: 'left' });
            doc.text(`Rs. ${item.revenue.toFixed(2)}`, tableColumns[5].x, rowY, { width: tableColumns[5].width, align: 'left' });
            doc.moveDown();
            rowY = doc.y;
        });

        doc.fontSize(10).text('Thank you for your order!', { align: 'center' });
        doc.end();
    } catch (error) {
        console.error('Error generating PDF sales report:', error);
        res.status(500).json({ error: 'Failed to generate PDF report' });
    }
};

/**
 * Endpoint to download the sales report in Excel or PDF format.
 */
const downloadSalesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate, format } = req.query;
        if (!filter) {
            return res.status(400).json({ error: 'Filter parameter is required' });
        }
        if (filter === 'custom' && (!startDate || !endDate)) {
            return res.status(400).json({ error: 'Start date and end date are required for custom filter' });
        }
        const reportData = await getSalesReportData(filter, startDate, endDate);
        switch (format?.toLowerCase()) {
            case 'excel':
                await generateExcel(reportData, res, filter, startDate, endDate);
                break;
            case 'pdf':
                await generatePDF(reportData, res, filter, startDate, endDate);
                break;
            default:
                res.status(400).json({ error: 'Invalid format. Supported formats are "excel" and "pdf"' });
        }
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            error: 'Error generating report',
            message: error.message
        });
    }
};

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    logout,


    loadSalesReport,
    getSalesReport,
    downloadSalesReport


}