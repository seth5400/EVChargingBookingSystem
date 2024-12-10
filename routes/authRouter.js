const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const router = express.Router();

const JWT_SECRET = 'your_jwt_secret_key'; // ควรเปลี่ยนเป็นคีย์ที่ปลอดภัย

// Route สำหรับ Register
router.get('/register', (req, res) => {
    res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
    const { username, password, confirmPassword, role } = req.body; // รวมการเก็บ role
    console.log('Registering user:', username); // เพิ่ม log
    try {
        if (password !== confirmPassword) {
            console.log('Passwords do not match');
            return res.render('register', { error: 'รหัสผ่านไม่ตรงกัน' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('Username already exists');
            return res.render('register', { error: 'ชื่อผู้ใช้ถูกใช้งานแล้ว' });
        }

        // แฮชรหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            password: hashedPassword,
            role: role // กำหนด role ที่ได้รับจากฟอร์ม
        });

        await newUser.save();
        console.log('User registered successfully');
        res.redirect('/login');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Server error');
    }
});

// Route สำหรับ Login
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.render('login', { error: 'ไม่พบชื่อผู้ใช้' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // ใช้ทั้ง session และ JWT เพื่อให้ยืดหยุ่น
        req.session.user = {
            _id: user._id,
            username: user.username,
            role: user.role
        };

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '10m' });
        req.session.token = token; // บันทึก token ใน session

        // Update lastLogin time
        user.lastLogin = new Date();
        await user.save();

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Server error');
    }
});

// Route สำหรับ Logout
router.get('/logout', (req, res) => {
    if (req.session.token) {
        // Find user and update lastLogout time
        const token = req.session.token;
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) return res.status(400).send('Invalid token');

            try {
                const user = await User.findById(decoded.userId);
                if (user) {
                    user.lastLogout = new Date();
                    await user.save();
                }
            } catch (err) {
                console.error(err);
            }

            req.session.destroy(err => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Logout failed');
                }
                res.redirect('/login');
            });
        });
    } else {
        res.redirect('/login');
    }
});

// Middleware: Check if authenticated
const isAuthenticated = (req, res, next) => {
    const token = req.session.token || req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded; // เก็บข้อมูล decoded ของผู้ใช้ใน req.user
            next();
        } catch (err) {
            res.redirect('/login');
        }
    } else if (req.session.user) {
        req.user = req.session.user; // รองรับการเช็ค session แบบเดิม
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware: Check if admin authenticated
const isAdminAuthenticated = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/login');
};

// Middleware: Check if admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Forbidden'); // หรือ redirection ไปยังหน้าอื่น
    }
};

module.exports = { router, isAuthenticated, isAdminAuthenticated, isAdmin };
