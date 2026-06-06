import sql from '../config/db.js';

export const createLabel = async (req, res) => {
    try {
        const { label_name } = req.body;
        const user_id = req.user?.id || 1;

        if (!label_name)
            return res.status(400).json({ message: 'Ten nhan khong duoc bo trong' });

        const checkLabel = await sql.query`
            SELECT * FROM Labels 
            WHERE user_id = ${user_id} AND label_name = ${label_name}`;
        if (checkLabel.recordset.length > 0)
            return res.status(400).json({ message: 'Nhan da ton tai roi' });

        await sql.query`
            INSERT INTO Labels (user_id, label_name) 
            VALUES (${user_id}, ${label_name})`;
        res.status(201).json({ message: 'Tao nhan thanh cong' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllLabels = async (req, res) => {
    try {
        const user_id = req.user?.id || 1;
        const result = await sql.query`
            SELECT * FROM Labels WHERE user_id = ${user_id}`;
        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateLabel = async (req, res) => {
    try {
        const { id } = req.params;
        const { label_name } = req.body;
        const user_id = req.user?.id || 1;

        await sql.query`
            UPDATE Labels SET label_name = ${label_name} 
            WHERE label_id = ${id} AND user_id = ${user_id}`;
        res.status(200).json({ message: 'Cap nhat nhan thanh cong' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteLabel = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id || 1;

        await sql.query`DELETE FROM Note_Labels WHERE label_id = ${id}`;
        await sql.query`DELETE FROM Labels WHERE label_id = ${id} AND user_id = ${user_id}`;
        res.status(200).json({ message: 'Xoa nhan thanh cong' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const attachLabelToNote = async (req, res) => {
    try {
        const { note_id, label_id } = req.body;

        const check = await sql.query`
            SELECT * FROM Note_Labels 
            WHERE note_id = ${note_id} AND label_id = ${label_id}`;
        if (check.recordset.length > 0)
            return res.status(400).json({ message: 'Ghi chu da duoc gan nhan roi' });

        await sql.query`
            INSERT INTO Note_Labels (note_id, label_id) 
            VALUES (${note_id}, ${label_id})`;
        res.status(200).json({ message: 'Gan nhan thanh cong' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const detachLabelFromNote = async (req, res) => {
    try {
        const { note_id, label_id } = req.body;
        await sql.query`
            DELETE FROM Note_Labels 
            WHERE note_id = ${note_id} AND label_id = ${label_id}`;
        res.status(200).json({ message: 'Go nhan khoi ghi chu thanh cong' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};