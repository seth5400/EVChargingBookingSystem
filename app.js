const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const authRouter = require('./routes/authRouter').router;
const apiRouter = require('./routes/apiRouter');
const router = require('./routes/myRouter'); // นำเข้า myRouter.js
const app = express();
const User = require('./models/user');
const bcrypt = require('bcryptjs');

// ตั้งค่า views และ engine เป็น ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware สำหรับจัดการคุกกี้
app.use(cookieParser());
app.use('/api', apiRouter);



// ตั้งค่า session
app.use(session({
    secret: 'your_session_secret_key', // แนะนำให้เก็บ secret ใน environment variables
    resave: false,
    saveUninitialized: false, // แนะนำให้ตั้งค่าเป็น false เพื่อความปลอดภัย
    cookie: { secure: false } // ตั้งค่าเป็น true หากใช้ HTTPS
}));

// Middleware สำหรับส่งข้อมูล user ไปยังทุกๆ เทมเพลต
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ฟังก์ชันสร้างผู้ใช้เริ่มต้น
async function createAdminUser() {
    try {
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('123', salt); // แฮชรหัสผ่าน '123'

            const newAdmin = new User({
                username: 'admin',
                password: hashedPassword,
                role: 'admin'
            });

            await newAdmin.save();
            console.log('Admin user created: username: admin, password: 123');
        } else {
            console.log('Admin user already exists');
        }
    } catch (err) {
        console.error('Error creating admin user:', err);
    }
}

// เรียกใช้ฟังก์ชันเมื่อเริ่มต้นแอปพลิเคชัน
createAdminUser();


// Middleware to handle favicon requests
app.get('/favicon.ico', (req, res) => res.status(204));

// Route สำหรับหน้าแรก (หน้าแรกที่แสดงเมื่อเข้าสู่ localhost:8080)
app.get('/', async (req, res) => {
    try {
        const Product = require('./models/product');
        const products = await Product.find();
        res.render('index', { products }); // เนื่องจากเราได้ส่ง user ผ่าน middleware แล้ว
    } catch (error) {
        console.error('Error fetching products for home page:', error);
        res.status(500).send('Server error');
    }
});

// Route สำหรับ admin dashboard
app.get('/admin', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        res.render('indexadmin');
    } else {
        res.redirect('/login');
    }
});

app.get('/user', async (req, res) => {
    if (req.session.user && req.session.user.role === 'user') {
        try {
            const Product = require('./models/product');
            const products = await Product.find();  // ดึงข้อมูล products จากฐานข้อมูล
            res.render('indexuser', { products });  // ส่ง products ไปที่ view
        } catch (error) {
            console.error('Error fetching products for user dashboard:', error);
            res.status(500).send('Server error');
        }
    } else {
        res.redirect('/login');
    }
});



// Middleware ตรวจสอบ role และเปลี่ยนหน้าไปยัง admin หรือ user dashboard
app.get('/dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        res.redirect('/admin');
    } else if (req.session.user && req.session.user.role === 'user') {
        res.redirect('/user');
    } else {
        res.redirect('/login');
    }
});

// เพิ่มการใช้ API Router และ routers อื่น ๆ
app.use('/', authRouter);
app.use('/', router); // ใช้เส้นทางจาก myRouter.js
app.use('/api', apiRouter);

// กำหนดไฟล์ static
app.use(express.static(path.join(__dirname, 'public')));

// Start server
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
});
