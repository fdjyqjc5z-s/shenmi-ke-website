const db = require('../db');

exports.addAddress = async (req, res) => {
  const { user_id, receiver_name, receiver_phone, receiver_address, is_default } = req.body;
  try {
    if (is_default) {
      await db.query('UPDATE user_addresses SET is_default=0 WHERE user_id=?', [user_id]);
    }
    const result = await db.query('INSERT INTO user_addresses (user_id, receiver_name, receiver_phone, receiver_address, is_default) VALUES (?, ?, ?, ?, ?)', [user_id, receiver_name, receiver_phone, receiver_address, is_default || 0]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

exports.listAddresses = async (req, res) => {
  const { user_id } = req.params;
  try {
    const addresses = await db.query('SELECT * FROM user_addresses WHERE user_id=?', [user_id]);
    res.json({ success: true, addresses });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

exports.updateAddress = async (req, res) => {
  const { id, receiver_name, receiver_phone, receiver_address, is_default } = req.body;
  try {
    if (is_default) {
      const addr = await db.query('SELECT user_id FROM user_addresses WHERE id=?', [id]);
      if(addr.length) await db.query('UPDATE user_addresses SET is_default=0 WHERE user_id=?', [addr[0].user_id]);
    }
    await db.query('UPDATE user_addresses SET receiver_name=?, receiver_phone=?, receiver_address=?, is_default=? WHERE id=?', [receiver_name, receiver_phone, receiver_address, is_default || 0, id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

exports.deleteAddress = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM user_addresses WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};