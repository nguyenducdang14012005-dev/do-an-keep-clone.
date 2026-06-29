import sql from '../config/db.js';

// Tạo                                          
export const setReminder = async(req, res) => {
    try {
        const {note_id, remind_time}= req.body;
        if(!note_id){
            return res.status(400).json({message: 'note_id ko ton tai hoac ko co '})
        }
        if(!remind_time){
            return res.status(400).json({message: 'remind_time ko ton tai hoac ko co '})
        }
        const gio = new Date(remind_time);
        gio.setHours(gio.getHours());
        await sql.query`INSERT INTO Reminders (note_id, remind_time, status) VALUES (${note_id}, ${gio}, 0)`;
        return res.status(200).json({message: ' dat gio thanh cong '})
    } catch (error){
        return res.status(500).json({error: error.message})

    }
}

// Lấy tất cả reminder
export const getReminders = async(req, res) => {
    try {
        const user_id = req.user?.id || 1;
        const result = await sql.query`
            SELECT r.* FROM Reminders r
            INNER JOIN Notes n ON r.note_id = n.note_id
            WHERE n.user_id = ${user_id}
            `;
            return res.status(200).json(result.recordset);

    }catch (error){
        return res.status(500).json({error: error.message})
    }
}

// Sửa reminder
export const updateReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { remind_time, status } = req.body;
        await sql.query`
            UPDATE Reminders SET remind_time = ${remind_time}, status = ${status}
            WHERE reminder_id = ${id}
        `;
        res.status(200).json({ message: 'Cap nhat nhac nho thanh cong' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa reminder
export const deleteReminder = async (req, res) => {
    try {
        const { id } = req.params;
        await sql.query`DELETE FROM Reminders WHERE reminder_id = ${id}`;
        res.status(200).json({ message: 'Xoa nhac nho thanh cong' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};