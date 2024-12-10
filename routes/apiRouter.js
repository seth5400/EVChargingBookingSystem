const express = require('express');
const Product = require('../models/product'); // โมเดลสินค้า
const User = require('../models/user'); // โมเดลผู้ใช้
const Booking = require('../models/booking'); // โมเดลการจอง
const Feedback = require('../models/feedback'); // โมเดลความคิดเห็น
const bcrypt = require('bcrypt'); // สำหรับแฮชรหัสผ่าน
const router = express.Router();

// ฟังก์ชันสร้าง PIN แบบสุ่ม
function generatePin() {
    // สร้าง PIN 6 หลัก แบบสุ่ม
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET: ดึงข้อมูลสินค้าทั้งหมด
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find(); // ดึงสินค้าทั้งหมดจากฐานข้อมูล
        res.json(products); // ส่งข้อมูลเป็น JSON
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// POST: เพิ่มสินค้าใหม่
router.post('/products', async (req, res) => {
    console.log(req.body); // ตรวจสอบค่าที่ได้รับจาก request
    try {
        const newProduct = new Product({
            charge_code: req.body.charge_code,
            price: req.body.price,
            connector_types: req.body.connector_types,
            description: req.body.description,
            image: req.body.image || '', 
            status: req.body.status || 'Available' 
        });

        await newProduct.save();
        res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT: อัปเดตสินค้าตาม ID
router.put('/products/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE: ลบสินค้าตาม ID
router.delete('/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// GET: ดึงข้อมูลผู้ใช้ทั้งหมด
router.get('/users', async (req, res) => {
    try {
        // ดึงข้อมูลผู้ใช้ทั้งหมดจากฐานข้อมูล
        const users = await User.find({}, '-password'); // ไม่รวมฟิลด์ password เพื่อความปลอดภัย
        res.status(200).json(users); // ส่งข้อมูลผู้ใช้ทั้งหมดเป็น JSON
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
    }
});

// POST: เพิ่มผู้ใช้ใหม่
router.post('/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // ตรวจสอบว่าชื่อผู้ใช้ซ้ำกันหรือไม่
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'ชื่อผู้ใช้ถูกใช้งานแล้ว' });
        }

        // แฮชรหัสผ่านก่อนบันทึกลงฐานข้อมูล
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // สร้างผู้ใช้ใหม่
        const newUser = new User({
            username,
            password: hashedPassword,
            role: role || 'user'  // ตั้งค่า default เป็น 'user'
        });

        await newUser.save(); // บันทึกผู้ใช้ลงในฐานข้อมูล
        res.status(201).json({ message: 'ผู้ใช้ถูกสร้างเรียบร้อย', user: newUser });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' });
    }
});

// GET: แสดงข้อมูลทั้งหมดของผู้ใช้ รวมถึงการจองและความคิดเห็น
router.get('/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // ดึงข้อมูลผู้ใช้
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
        }

        // ดึงข้อมูลการจองของผู้ใช้
        const bookings = await Booking.find({ userId: userId }).populate('productId');

        // ดึงข้อมูล Feedback ของผู้ใช้
        const feedbacks = await Feedback.find({ userId: userId }).populate('stationId');

        // ส่งข้อมูลรวมของผู้ใช้ การจอง และความคิดเห็น
        res.status(200).json({
            user: user,
            bookings: bookings,
            feedbacks: feedbacks
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
    }
});

// POST: สร้างการจองใหม่
router.post('/bookings', async (req, res) => {
    try {
        const { userId, productId, startTime, endTime } = req.body;

        // ตรวจสอบว่าผลิตภัณฑ์ที่เลือกมีสถานะ 'Available' หรือไม่
        const product = await Product.findById(productId);
        if (!product || product.status !== 'Available') {
            return res.status(400).json({ error: 'แท่นชาร์จไม่พร้อมใช้งาน' });
        }

        // ตรวจสอบการจองที่ทับซ้อน
        const overlappingBookings = await Booking.find({
            productId: productId,
            status: { $in: ['Booked', 'In Use'] },
            $or: [
                { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } }
            ]
        });

        if (overlappingBookings.length > 0) {
            return res.status(400).json({ error: 'ช่วงเวลาที่เลือกถูกจองไปแล้ว' });
        }

        // สร้างการจองใหม่
        const newBooking = new Booking({
            userId,
            productId,
            pin: generatePin(),  // สร้าง PIN สำหรับการจอง
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            expirationTime: new Date(new Date(startTime).getTime() + 30 * 60000),  // 30 นาที
            status: 'Booked'
        });

        await newBooking.save(); // บันทึกการจองลงในฐานข้อมูล

        // เปลี่ยนสถานะของ Product เป็น 'Booked'
        product.status = 'Booked';
        await product.save();

        res.status(201).json({ message: 'การจองสำเร็จ', booking: newBooking });
    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการจอง' });
    }
});


// POST: ส่งความคิดเห็นใหม่
router.post('/feedbacks', async (req, res) => {
    try {
        const { userId, stationId, issueType, message } = req.body;

        // ตรวจสอบว่าผู้ใช้และสถานีชาร์จมีอยู่จริงหรือไม่
        const user = await User.findById(userId);
        const station = await Product.findById(stationId);
        if (!user || !station) {
            return res.status(400).json({ error: 'ข้อมูลผู้ใช้หรือสถานีชาร์จไม่ถูกต้อง' });
        }

        // สร้าง Feedback ใหม่
        const newFeedback = new Feedback({
            userId,
            stationId,
            issueType,
            message
        });

        await newFeedback.save(); // บันทึก Feedback ลงในฐานข้อมูล
        res.status(201).json({ message: 'ความคิดเห็นถูกส่งเรียบร้อย', feedback: newFeedback });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่งความคิดเห็น' });
    }
});


// GET: ดูการจองของผู้ใช้
router.get('/mybookings/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // ดึงข้อมูลการจองของผู้ใช้
        const bookings = await Booking.find({ userId: userId }).populate('productId'); // ใช้ populate เพื่อดึงข้อมูลสถานีชาร์จ

        // ถ้าไม่พบการจองใดๆ
        if (!bookings.length) {
            return res.status(404).json({ message: 'ไม่พบการจองใดๆ' });
        }

        res.status(200).json({ bookings });
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการจอง' });
    }
});


// POST: สมัครผู้ใช้ใหม่
router.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
        }

        // แฮชรหัสผ่านก่อนเก็บลงฐานข้อมูล
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            password: hashedPassword,
            role: role || 'user'
        });

        await newUser.save();
        res.status(201).json({ message: 'ผู้ใช้ถูกสร้างแล้ว', user: newUser });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครผู้ใช้' });
    }
});


// POST: จองสถานีชาร์จ
router.post('/book', async (req, res) => {
    try {
        const { userId, productId, startTime, endTime } = req.body;

        // แปลงเวลาเป็น Date object
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(endTime);

        // สร้าง PIN สำหรับการจอง
        const pin = generatePin();

        // ตรวจสอบสถานีที่จองว่าทับซ้อนกับเวลาจองอื่นหรือไม่
        const overlappingBookings = await Booking.find({
            productId,
            status: { $in: ['Booked', 'In Use'] },
            $or: [
                { startTime: { $lt: endDateTime }, endTime: { $gt: startDateTime } }
            ]
        });

        if (overlappingBookings.length > 0) {
            return res.status(400).json({ message: 'ช่วงเวลานี้ถูกจองไปแล้ว' });
        }

        // สร้างการจองใหม่
        const newBooking = new Booking({
            userId,
            productId,
            startTime: startDateTime,
            endTime: endDateTime,
            pin,
            expirationTime: new Date(startDateTime.getTime() + 30 * 60000) // เวลาหมดอายุ 30 นาทีหลังการจอง
        });

        await newBooking.save();

        // อัปเดตสถานะของสถานีชาร์จ
        const product = await Product.findById(productId);
        product.status = 'Booked';
        await product.save();

        res.status(201).json({ message: 'การจองสำเร็จ', booking: newBooking });
    } catch (error) {
        console.error('Error booking charging station:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการจอง' });
    }
});

// POST: ส่ง Feedback
router.post('/feedback', async (req, res) => {
    try {
        const { userId, stationId, issueType, message } = req.body;

        const newFeedback = new Feedback({
            userId,
            stationId,
            issueType,
            message
        });

        await newFeedback.save();
        res.status(201).json({ message: 'Feedback ถูกส่งเรียบร้อยแล้ว', feedback: newFeedback });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่ง Feedback' });
    }
});

// GET: ดู Feedback ที่ส่งโดยผู้ใช้
router.get('/myfeedbacks/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const feedbacks = await Feedback.find({ userId }).populate('stationId');

        if (!feedbacks.length) {
            return res.status(404).json({ message: 'ไม่พบ Feedback ที่ส่ง' });
        }

        res.status(200).json({ feedbacks });
    } catch (error) {
        console.error('Error fetching user feedbacks:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Feedback' });
    }
});

// GET: ดึงข้อมูลผู้ใช้ที่เป็น admin ทั้งหมด
router.get('/admins', async (req, res) => {
    try {
        // ดึงข้อมูลผู้ใช้ที่มี role เป็น 'admin'
        const admins = await User.find({ role: 'admin' }, '-password'); // ไม่รวมฟิลด์ password เพื่อความปลอดภัย
        res.status(200).json(admins); // ส่งข้อมูล admin ทั้งหมดเป็น JSON
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล admin' });
    }
});



module.exports = router;
