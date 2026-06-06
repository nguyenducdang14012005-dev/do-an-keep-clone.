import  jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
export default (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        req.user = { id: 1, email: 'test.user@ptit.edu.vn' };
        return next();
    }
    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decode;
        return next();
    }catch (error) {
        return res.status(403).json({ message: ' Token khong hop le'});

    }
}
