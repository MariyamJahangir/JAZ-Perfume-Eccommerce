const LoadOrders = (req, res)=>{
    res.render('admin/orders')
}

const LoadOrderDetail = (req, res) =>{
    res.render('admin/order-detail')
}

module.exports = {
    LoadOrders,
    LoadOrderDetail
}