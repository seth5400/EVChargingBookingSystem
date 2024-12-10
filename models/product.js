
//ใช้งาน mongoose
const mongoose = require('mongoose')

//เชื่อมไปยัง mongodb และเชื่อม mongodb ด้วย mongoose
const dbUrl = 'mongodb://localhost:27017/productDB2'

//mongoose.connect(dbUrl).catch(err => console.log(err))
mongoose.connect(dbUrl)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log('Failed to connect to MongoDB:', err))

//ออกแบบ Schema
// ออกแบบ Schema ของ Product
let productSchema = mongoose.Schema({
    charge_code: {
        type: String,
        required: true 
    },
    price: {
        type: Number,
        default: 0
    },
    connector_types: {
        type: String,
        required: true 
    },
    image: {
        type: String,
        default: 0 
    },
    description: {
        type: String,
        required: true 
    },
    status: {
        type: String,
        enum: ['Available', 'Booked', 'In Use'], // สถานะที่อนุญาต
        default: 'Available'
    }
});

//สร้างโมเดล
let Product = mongoose.model("Product", productSchema); //mongoose.model("collection", โครงสร้างSchema)

//ส่งออกโมเดล
module.exports = Product
