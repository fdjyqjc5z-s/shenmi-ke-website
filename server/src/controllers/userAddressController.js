import { query, transaction } from '../config/db.js';

function clean(value, max = 255) {
  return String(value || '').trim().slice(0, max);
}

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function readAddressPayload(body = {}) {
  return {
    receiverName: clean(body.receiverName || body.receiver_name, 64),
    receiverPhone: clean(body.receiverPhone || body.receiver_phone, 32),
    receiverAddress: clean(body.receiverAddress || body.receiver_address, 255),
    isDefault: Boolean(body.isDefault || body.is_default)
  };
}

export async function listMyAddresses(req, res, next) {
  try {
    const rows = await query(
      `SELECT id, receiver_name, receiver_phone, receiver_address, is_default, created_at, updated_at
       FROM user_addresses
       WHERE user_id = :userId
       ORDER BY is_default DESC, id DESC`,
      { userId: req.user.id }
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function createMyAddress(req, res, next) {
  try {
    const payload = readAddressPayload(req.body);
    if (!payload.receiverName || !payload.receiverPhone || !payload.receiverAddress) {
      return res.status(400).json({ success: false, message: '请填写完整收货地址' });
    }

    const result = await transaction(async (connection) => {
      const [[countRow]] = await connection.execute(
        'SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = :userId',
        { userId: req.user.id }
      );
      const shouldDefault = payload.isDefault || Number(countRow?.total || 0) === 0;

      if (shouldDefault) {
        await connection.execute('UPDATE user_addresses SET is_default = 0 WHERE user_id = :userId', { userId: req.user.id });
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO user_addresses (user_id, receiver_name, receiver_phone, receiver_address, is_default)
         VALUES (:userId, :receiverName, :receiverPhone, :receiverAddress, :isDefault)`,
        {
          userId: req.user.id,
          receiverName: payload.receiverName,
          receiverPhone: payload.receiverPhone,
          receiverAddress: payload.receiverAddress,
          isDefault: shouldDefault ? 1 : 0
        }
      );

      return insertResult.insertId;
    });

    return res.status(201).json({ success: true, message: '地址已保存', data: { id: result } });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyAddress(req, res, next) {
  try {
    const addressId = Number(req.params.id);
    const payload = readAddressPayload(req.body);
    if (!payload.receiverName || !payload.receiverPhone || !payload.receiverAddress) {
      return res.status(400).json({ success: false, message: '请填写完整收货地址' });
    }

    await transaction(async (connection) => {
      const [[address]] = await connection.execute(
        'SELECT id FROM user_addresses WHERE id = :addressId AND user_id = :userId LIMIT 1 FOR UPDATE',
        { addressId, userId: req.user.id }
      );
      if (!address) throw httpError('地址不存在', 404);

      if (payload.isDefault) {
        await connection.execute('UPDATE user_addresses SET is_default = 0 WHERE user_id = :userId', { userId: req.user.id });
      }

      await connection.execute(
        `UPDATE user_addresses
         SET receiver_name = :receiverName,
             receiver_phone = :receiverPhone,
             receiver_address = :receiverAddress,
             is_default = :isDefault
         WHERE id = :addressId AND user_id = :userId`,
        {
          receiverName: payload.receiverName,
          receiverPhone: payload.receiverPhone,
          receiverAddress: payload.receiverAddress,
          isDefault: payload.isDefault ? 1 : 0,
          addressId,
          userId: req.user.id
        }
      );
    });

    return res.json({ success: true, message: '地址已更新' });
  } catch (error) {
    return next(error);
  }
}

export async function deleteMyAddress(req, res, next) {
  try {
    const addressId = Number(req.params.id);
    await transaction(async (connection) => {
      const [[address]] = await connection.execute(
        'SELECT id, is_default FROM user_addresses WHERE id = :addressId AND user_id = :userId LIMIT 1 FOR UPDATE',
        { addressId, userId: req.user.id }
      );
      if (!address) throw httpError('地址不存在', 404);

      await connection.execute('DELETE FROM user_addresses WHERE id = :addressId AND user_id = :userId', {
        addressId,
        userId: req.user.id
      });

      if (Number(address.is_default) === 1) {
        await connection.execute(
          `UPDATE user_addresses
           SET is_default = 1
           WHERE user_id = :userId
           ORDER BY id DESC
           LIMIT 1`,
          { userId: req.user.id }
        );
      }
    });

    return res.json({ success: true, message: '地址已删除' });
  } catch (error) {
    return next(error);
  }
}
