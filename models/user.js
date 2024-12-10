const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true // ตรวจสอบว่าชื่อผู้ใช้ไม่ซ้ำกัน
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    lastLogin: { type: Date },
    lastLogout: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);
