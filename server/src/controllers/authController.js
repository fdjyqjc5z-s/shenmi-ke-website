import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { transaction, query } from '../config/db.js';
import { securityConfig } from '../config/security.js';
import { isSafeString, isValidPassword, sanitizeString } from '../utils/validators.js';
import { createInviteCode, createUserCode } from '../utils/id.js';
import { initUserAccounts, rewardUserPoints } from '../services/accountService.js';
import { bindInviteRelation, findInviterByCode } from '../services/inviteService.js';

function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: 'user'
    },
    process.env.JWT_SECRET || 'development_only_secret',
    { expiresIn: securityConfig.jwt.expiresIn }
  );
}

export async function register(req, res, next) {
  try {
    const username = sanitizeString(req.body.username, 64);
    const password = req.body.password;
    const nickname = sanitizeString(req.body.nickname || username, 64);
    const inviteCodeInput = sanitizeString(req.body.inviteCode || '', 32);

    if (!isSafeString(username, 64) || username.length < 3) {
      return res.status(400).json({ success: false, message: '用户名至少3位' });
    }

    if (!isValidPassword(password, securityConfig.password.minLength)) {
      return res.status(400).json({ success: false, message: '密码至少8位，并包含字母和数字' });
    }

    const result = await transaction(async (connection) => {
      const [[exists]] = await connection.execute(
        'SELECT id FROM users WHERE username = :username LIMIT 1',
        { username }
      );

      if (exists) {
        const error = new Error('用户名已存在');
        error.statusCode = 409;
        throw error;
      }

      const inviter = await findInviterByCode(connection, inviteCodeInput);
      const passwordHash = await bcrypt.hash(password, securityConfig.password.bcryptSaltRounds);
      const userCode = createUserCode();
      const ownInviteCode = createInviteCode();

      const [insertResult] = await connection.execute(
        `INSERT INTO users (user_code, username, password_hash, nickname, invite_code, invited_by_user_id, register_ip)
         VALUES (:userCode, :username, :passwordHash, :nickname, :ownInviteCode, :inviterId, :registerIp)`,
        {
          userCode,
          username,
          passwordHash,
          nickname,
          ownInviteCode,
          inviterId: inviter?.id || null,
          registerIp: req.ip
        }
      );

      const userId = insertResult.insertId;
      await initUserAccounts(connection, userId);

      if (inviter) {
        await bindInviteRelation(connection, inviter.id, userId, inviteCodeInput);
        await rewardUserPoints(connection, inviter.id, 20, '邀请新人注册奖励', 'invite', userId);
      }

      await rewardUserPoints(connection, userId, 50, '新人注册奖励', 'register', userId);

      return {
        id: userId,
        username,
        nickname,
        user_code: userCode,
        invite_code: ownInviteCode
      };
    });

    return res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: result,
        token: signUserToken(result)
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const username = sanitizeString(req.body.username, 64);
    const password = req.body.password;

    const [rows] = await query(
      'SELECT id, username, nickname, password_hash, user_code, invite_code, status FROM users WHERE username = :username LIMIT 1',
      { username }
    );

    const user = rows;

    if (!user || user.status !== 'normal') {
      return res.status(401).json({ success: false, message: '账号不存在或已被限制' });
    }

    const matched = await bcrypt.compare(password, user.password_hash);
    if (!matched) {
      return res.status(401).json({ success: false, message: '账号或密码错误' });
    }

    await query(
      'UPDATE users SET last_login_ip = :ip, last_login_at = NOW() WHERE id = :id',
      { ip: req.ip, id: user.id }
    );

    return res.json({
      success: true,
      message: '登录成功',
      data: {
        token: signUserToken(user),
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          user_code: user.user_code,
          invite_code: user.invite_code
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}
