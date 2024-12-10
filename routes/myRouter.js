const express = require('express');
const router = express.Router();
const path = require('path');
const Product = require('../models/product');
const Booking = require('../models/booking');
const User = require('../models/user'); // นำเข้าโมเดล User
const Feedback = require('../models/feedback');  // New Feedback model
const { isAuthenticated, isAdmin } = require('./authRouter');
const multer = require('multer');
const bcrypt = require('bcryptjs'); // เปลี่ยนจาก 'bcrypt' เป็น 'bcryptjs'

// ฟังก์ชันสร้าง PIN แบบสุ่ม 6 หลัก
function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // สร้าง PIN 6 หลัก
}

// Setup Multer storage for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/images/products'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + ".jpg");
    }
});

const upload = multer({
    storage: storage
});

setInterval(async () => {
    const now = new Date();
    const expiredBookings = await Booking.find({
        status: 'Booked',
        expirationTime: { $lt: now }
    });

    expiredBookings.forEach(async (booking) => {
        booking.status = 'Cancel';  // เปลี่ยนสถานะเป็น 'Cancel' เมื่อหมดเวลา
        await booking.save();

        const product = await Product.findById(booking.productId);
        if (product) {
            product.status = 'Available';  // เปลี่ยนสถานะของสินค้าเป็น 'Available'
            await product.save();
        }
    });
}, 1 * 60 * 1000); // ตรวจสอบทุก 1 นาที

// GET: Feedback form for users
router.get('/feedback', isAuthenticated, async (req, res) => {
    try {
        const products = await Product.find(); // Fetch available stations (products)
        res.render('feedback', { user: req.session.user, products: products });
    } catch (error) {
        console.error('Error fetching stations for feedback:', error);
        res.status(500).send('Server error');
    }
});

// POST: Handle feedback submission
router.post('/feedback', isAuthenticated, async (req, res) => {
    try {
        const newFeedback = new Feedback({
            userId: req.session.user._id,
            stationId: req.body.stationId,
            issueType: req.body.issueType,
            message: req.body.message
        });
        await newFeedback.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ success: false });
    }
});


// GET: Admin page to view feedback reports
router.get('/adminfeedback', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const feedbacks = await Feedback.find().populate('userId').populate('stationId'); // เพิ่ม populate สำหรับ stationId
        res.render('admin_feedback', { feedbacks, user: req.session.user });
    } catch (err) {
        console.error('Error fetching feedback reports:', err);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

router.post('/update-status', async (req, res) => {
    try {
        const booking = await Booking.findById(req.body.bookingId);
        if (booking && booking.status === 'Booked') {
            booking.status = 'Cancel'; // เปลี่ยนสถานะเป็น 'Cancel' เมื่อหมดเวลา
            await booking.save();

            const product = await Product.findById(booking.productId);
            if (product) {
                product.status = 'Available'; // เปลี่ยนสถานะของสินค้าเป็น 'Available'
                await product.save();
            }

            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Booking not found or status incorrect' });
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.json({ success: false, message: 'Error updating status' });
    }
});



// GET: Booking page
router.get('/booking', isAuthenticated, async (req, res) => {
    try {
        const statuses = req.query.statuses || []; // รับค่าที่กรองจาก URL
        const searchQuery = req.query.search || ''; // รับค่าการค้นหา

        let filter = {};

        if (statuses.length > 0) {
            filter.status = { $in: statuses }; // กรองจากสถานะที่เลือก
        }

        // เพิ่มการค้นหาจาก charge_code หรือ status
        if (searchQuery) {
            filter.$or = [
                { charge_code: { $regex: searchQuery, $options: 'i' } }, 
                { status: { $regex: searchQuery, $options: 'i' } }, 
                { description: { $regex: searchQuery, $options: 'i' } }, 
                { connector_types: { $regex: searchQuery, $options: 'i' } } 
            ];
        }

        const products = await Product.find(filter);
        res.render('booking', { products: products, user: req.session.user });
    } catch (error) {
        console.error('Error fetching booking page:', error);
        res.status(500).send('Server error');
    }
});


router.get('/indexuser', isAuthenticated, async (req, res) => {
    try {
        const statuses = req.query.statuses || []; // รับค่าที่กรองจาก URL
        const searchQuery = req.query.search || ''; // รับค่าการค้นหา

        let filter = {};

        if (statuses.length > 0) {
            filter.status = { $in: statuses }; // กรองจากสถานะที่เลือก
        }

        // เพิ่มการค้นหาจาก charge_code หรือ status
        if (searchQuery) {
            filter.$or = [
                { charge_code: { $regex: searchQuery, $options: 'i' } }, 
                { status: { $regex: searchQuery, $options: 'i' } }, 
                { description: { $regex: searchQuery, $options: 'i' } }, 
                { connector_types: { $regex: searchQuery, $options: 'i' } } 
            ];
        }

        const products = await Product.find(filter);
        res.render('booking', { products: products, user: req.session.user });
    } catch (error) {
        console.error('Error fetching booking page:', error);
        res.status(500).send('Server error');
    }
});

// GET: User bookings page
// router.get('/mybooking', isAuthenticated, async (req, res) => {
//     try {
//         const bookings = await Booking.find({ userId: req.session.user._id }).populate('productId');
//         res.render('mybooking', { bookings, user: req.session.user });
//     } catch (error) {
//         console.error('Error fetching bookings:', error);
//         res.status(500).send('Server error');
//     }
// });
router.get('/mybooking', isAuthenticated, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.session.user._id }).populate('productId');
        const products = await Product.find(); // ดึงข้อมูลสถานีชาร์จทั้งหมด
        res.render('mybooking', { bookings, user: req.session.user, products }); // ส่ง products ไปที่ view
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send('Server error');
    }
});


// GET: Login and Register pages
router.get('/login', (req, res) => {
    res.render('login');
});
router.get('/register', (req, res) => {
    res.render('register');
});

// GET: Form to add product (Admin only)
router.get('/addProduct', isAuthenticated, isAdmin, (req, res) => {
    res.render('form', { user: req.session.user });
});

// GET: Manage page (Admin only)
router.get('/manage', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const products = await Product.find();
        const bookings = await Booking.find().populate('userId').populate('productId');
        res.render('manage', { products, bookings, user: req.session.user });
    } catch (error) {
        console.error('Error fetching manage data:', error);
        res.status(500).send('Server error');
    }
});

// GET: Product details
router.get('/product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render('product', { product: product, user: req.session.user });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Server error');
    }
});

// POST: Insert new product (Admin only)
router.post('/insert', isAuthenticated, isAdmin, upload.single("image"), async (req, res) => {
    try {
        const newProduct = new Product({
            charge_code: req.body.charge_code,
            price: req.body.price,
            // image: req.file.filename,
            connector_types: req.body.connector_types,
            description: req.body.description,
            status: 'Available' // กำหนดสถานะเริ่มต้นเป็น 'ว่าง'
        });
        await newProduct.save();
        res.redirect('/manage');
    } catch (error) {
        console.error('Error saving product:', error);
        res.status(500).send('Server error');
    }
});

// POST: Edit product (Admin only)
router.post('/edit', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.body.edit_id);
        res.render('edit', { product, user: req.session.user });
    } catch (error) {
        console.error('Error fetching product for edit:', error);
        res.status(500).send('Server error');
    }
});

// POST: Update product (Admin only)
router.post('/update', isAuthenticated, isAdmin, async (req, res) => {
    const update_id = req.body.update_id;
    try {
        const updatedProduct = {
            charge_code: req.body.charge_code,
            price: req.body.price,
            connector_types: req.body.connector_types,
            description: req.body.description
        };

        await Product.findByIdAndUpdate(update_id, updatedProduct);
        res.redirect('/manage');
    } catch (err) {
        console.log(err);
        res.status(500).send("Error updating product");
    }
});

// GET: Delete product (Admin only)
router.get('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id); // เปลี่ยนจาก findByIdAndRemove เป็น findByIdAndDelete
        res.redirect('/manage');
    } catch (err) {
        console.log(err);
        res.status(500).send("Error deleting product");
    }
});


router.post('/book', isAuthenticated, async (req, res) => {
    try {
        const { productId, startTime, endTime } = req.body;
        const userId = req.session.user._id;

        // แปลงเวลาให้เป็น Date object
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(endTime);

        // เวลาหมดอายุของการจอง (30 นาทีหลังการจอง)
        const expirationTime = new Date(startDateTime);
        expirationTime.setMinutes(startDateTime.getMinutes() + 30); //ปรับเวลา

        // ตรวจสอบการจองที่ทับซ้อน
        const overlappingBookings = await Booking.find({
            productId: productId,
            status: { $in: ['Booked', 'In Use'] },
            $or: [
                { startTime: { $lt: endDateTime }, endTime: { $gt: startDateTime } }
            ]
        });

        if (overlappingBookings.length > 0) {
            return res.json({ success: false, message: 'ช่วงเวลานี้ถูกจองไปแล้ว' });
        }

        // บันทึกการจองใหม่
        const newBooking = new Booking({
            userId: userId,
            productId: productId,
            startTime: startDateTime,
            endTime: endDateTime,
            expirationTime: expirationTime,  // กำหนดเวลาหมดอายุ
            pin: generatePin(),
        });

        await newBooking.save();

        // เปลี่ยนสถานะของ Product เป็น 'จองแล้ว'
        const product = await Product.findById(productId);
        if (product) {
            product.status = 'Booked';
            await product.save();
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error during booking:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการจองสินค้า' });
    }
});



// POST: เสร็จสิ้นการใช้งาน
router.post('/complete-booking', isAuthenticated, async (req, res) => {
    try {
        const bookingId = req.body.bookingId;

        const booking = await Booking.findById(bookingId);
        if (!booking || booking.userId.toString() !== req.session.user._id.toString()) {
            return res.json({ success: false, message: 'ไม่พบการจองหรือคุณไม่มีสิทธิ์ดำเนินการ' });
        }

        // เปลี่ยนสถานะการจองเป็น "เสร็จสิ้น"
        booking.status = 'Completed';
        
        await booking.save();

        const product = await Product.findById(booking.productId);
        if (product) {
            product.status = 'Available';
            await product.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'เกิดข้อผิดพลาดในการเสร็จสิ้นการใช้งาน' });
    }
});



// POST: Cancel booking
router.post('/cancel-booking', isAuthenticated, async (req, res) => {
    try {
        const booking = await Booking.findById(req.body.bookingId);
        if (!booking || booking.userId.toString() !== req.session.user._id.toString()) {
            return res.json({ success: false, message: 'ไม่พบการจองหรือคุณไม่มีสิทธิ์ยกเลิก' });
        }

        booking.status = 'Cancel';
        await booking.save();

        const product = await Product.findById(booking.productId);
        if (product) {
            product.status = 'Available';
            await product.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error canceling booking:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยกเลิกการจอง' });
    }
});

// POST: Accept booking (Admin only)
router.post('/accept-booking', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const booking = await Booking.findById(req.body.bookingId).populate('productId').populate('userId');
        if (!booking || booking.status !== 'Booked') {
            return res.status(400).send('ไม่สามารถยอมรับการจองนี้ได้');
        }

        booking.status = 'In Use';
        await booking.save();

        const product = await Product.findById(booking.productId._id);
        product.status = 'In Use';
        await product.save();

        res.redirect('/manage');
    } catch (error) {
        console.error('Error accepting booking:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการยอมรับการจอง');
    }
});

// POST: Cancel booking by Admin
router.post('/cancel-booking-admin', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const booking = await Booking.findById(req.body.bookingId);
        if (!booking || booking.status !== 'Booked') {
            return res.status(400).send('ไม่สามารถยกเลิกการจองนี้ได้');
        }

        booking.status = 'Cancel';
        await booking.save();

        const product = await Product.findById(booking.productId);
        product.status = 'Available';
        await product.save();

        res.redirect('/manage');
    } catch (error) {
        console.error('Error canceling booking by admin:', error);
        res.status(500).send('Error canceling booking.');
    }
});

// GET: Profile page
// router.get('/profile', isAuthenticated, async (req, res) => {
//     try {
//         const user = await User.findById(req.session.user._id);
//         res.render('profile', { user });
//     } catch (error) {
//         console.error('Error fetching profile:', error);
//         res.status(500).send('Server error');
//     }
// });
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const products = await Product.find(); // ดึงข้อมูล products
        res.render('profile', { user, products }); // ส่ง products ไปยัง view
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('Server error');
    }
});

router.post('/confirm-arrival', isAuthenticated, async (req, res) => {
    try {
        const { bookingId, pin } = req.body;
        const booking = await Booking.findById(bookingId);

        const now = new Date();
        if (!booking || booking.pin !== pin || now < booking.startTime || now > booking.endTime) {
            return res.json({ success: false, message: 'ไม่สามารถยืนยันการมาถึงได้เนื่องจากอยู่นอกเวลาที่จอง' });
        }

        booking.arrived = true;
        booking.status = 'In Use';
        await booking.save();

        // เปลี่ยนสถานะ Product เป็น 'กำลังใช้งาน'
        const product = await Product.findById(booking.productId);
        if (product) {
            product.status = 'In Use';
            await product.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error confirming arrival:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยืนยัน' });
    }
});




// GET: Edit Profile page
// router.get('/edit-profile', isAuthenticated, async (req, res) => {
//     try {
//         const user = await User.findById(req.session.user._id);
//         res.render('editProfile', { user, error: null });
//     } catch (error) {
//         console.error('Error fetching profile for edit:', error);
//         res.status(500).send('Server error');
//     }
// });
router.get('/edit-profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const products = await Product.find(); // ดึงข้อมูล products
        res.render('editProfile', { user, products, error: null }); // ส่ง products ไปยัง view
    } catch (error) {
        console.error('Error fetching profile for edit:', error);
        res.status(500).send('Server error');
    }
});

// POST: Handle Edit Profile
router.post('/edit-profile', isAuthenticated, async (req, res) => {
    try {
        const { username, password, confirmPassword } = req.body;
        const user = await User.findById(req.session.user._id);

        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.render('editProfile', { user, error: 'ชื่อผู้ใช้ถูกใช้งานแล้ว' });
            }
            user.username = username;
        }

        if (password) {
            if (password !== confirmPassword) {
                return res.render('editProfile', { user, error: 'รหัสผ่านไม่ตรงกัน' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            user.password = hashedPassword;
        }

        await user.save();
        req.session.user = {
            _id: user._id,
            username: user.username,
            role: user.role
        };

        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Server error');
    }
});

router.get('/report', async (req, res) => {
    try {
        // ค้นหาผู้ใช้ที่มีการจองบ่อยที่สุด
        const frequentUsers = await Booking.aggregate([
            { $group: { _id: "$userId", count: { $sum: 1 } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: "$user" },
            { $project: { _id: 0, username: "$user.username", usageCount: "$count" } },
            { $sort: { usageCount: -1 } },
            { $limit: 5 }
        ]);

        // ค้นหาแท่นชาร์ตที่ถูกใช้งานมากที่สุด
        const popularStations = await Booking.aggregate([
            { $group: { _id: "$productId", count: { $sum: 1 } } },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'station' } },
            { $unwind: "$station" },
            { $project: { _id: 0, charge_code: "$station.charge_code", usageCount: "$count" } },
            { $sort: { usageCount: -1 } },
            { $limit: 5 }
        ]);

        // สถิติโดยรวม
        const totalUsers = await User.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const totalStations = await Product.countDocuments();

        // ส่งข้อมูลไปที่ EJS สำหรับการแสดงผล
        res.render('report', { 
            frequentUsers, 
            popularStations, 
            totalUsers, 
            totalBookings, 
            totalStations 
        });
    } catch (error) {
        console.error('Error fetching admin report:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
