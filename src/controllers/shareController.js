import sql from '../config/db.js';
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
     service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  // ← dùng env
        pass: process.env.EMAIL_PASS   // ← dùng env
    }
});

export const shareNode = async (req, res) => {
    try {
        const { note_id } = req.params;
        const { email, permission } = req.body;
        if (!email || !permission) {
            return res.status(400).json({ message: '0 ton tai du kieu '})
        }
        const userResult = await sql.query`SELECT user_id FROM Users WHERE email = ${email}`
        if(userResult.recordset.length === 0){
            return res.status(404).json({ message: 'o tim thay du lieu nha '})
        }
        const sharedUserId = userResult.recordset[0].user_id;
        const check = await sql.query`SELECT * FROM Note_Shares WHERE note_id = ${note_id} AND user_id = ${sharedUserId}`;
        if (check.recordset.length > 0){
            return res.status(400).json({ message: ' da chia se cho nguoi nay r nha '})
        }
        await sql.query`INSERT INTO Note_Shares (note_id, user_id, permission) VALUES (${note_id}, ${sharedUserId}, ${permission})`;

        
       const noteResult = await sql.query`SELECT title, content FROM Notes WHERE note_id = ${note_id}`;
const note = noteResult.recordset[0];

await transporter.sendMail({
    from: 'nguyenducdang14012005@gmail.com',
    to: email,
    subject: 'Có người chia sẻ ghi chú với bạn!',
    html: `
        <h3> ${note.title || "Không có tiêu đề"}</h3>
        <p>${note.content || "Không có nội dung"}</p>
        <hr/>
        <p>Quyền truy cập: <b>${permission}</b></p>
    `
});
        console.log(" Đã gửi email tới:", email); 

        res.status(201).json({message: 'da chia se ghi chu thanh cong '})
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
// Lấy danh sách người được chia sẻ
export const getShares = async (req, res) => {
    try {
        const { note_id } = req.params;
        const result = await sql.query`
        SELECT ns.*, u.email FORM Note_Shares ns
        INNER JOIN Users u ON ns.user_id = u.user_id
        WHERE ns.note_id = ${note_id}
    `;
    return res.status(200).json(result.recordset);
    } catch (error){
        res.status(500).json({ error: error.message});

    }
}


export const removeShare = async (req, res) => {
    try{
       const { share_id } = req.params;  
        await sql.query`DELETE FROM Note_Shares WHERE share_id = ${share_id}`; 
        res.status(200).json({ message: ' xoa chia se thanh cong '})

    } catch (error){
        res.status(500).json({ error: error.message});
    }
}
