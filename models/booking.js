const mongoose = require('mongoose');

let bookingSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    status: {
        type: String,
        enum: ['Booked', 'Completed', 'Cancel', 'In Use'],
        default: 'Booked'
    },
    pin: {
        type: String,  // เก็บ PIN
        required: true
    },
    arrived: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: Date,  // เวลาเริ่มต้นของการจอง
        required: true
    },
    endTime: {
        type: Date,  // เวลาสิ้นสุดของการจอง
        required: true
    },
    expirationTime: {
        type: Date,  // เวลาเมื่อการจองหมดอายุ (30 นาทีหลังการจอง)
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

let Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
