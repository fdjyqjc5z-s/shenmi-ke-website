export async function initUserAccounts(connection, userId) {
  await connection.execute(
    'INSERT INTO user_wallets (user_id) VALUES (:userId)',
    { userId }
  );

  await connection.execute(
    'INSERT INTO points_accounts (user_id) VALUES (:userId)',
    { userId }
  );
}

export async function rewardUserPoints(connection, userId, points, description, sourceType = null, sourceId = null) {
  if (!points || points <= 0) return;

  const [[account]] = await connection.execute(
    'SELECT points_balance FROM points_accounts WHERE user_id = :userId FOR UPDATE',
    { userId }
  );

  const before = account?.points_balance || 0;
  const after = before + points;

  await connection.execute(
    'UPDATE points_accounts SET points_balance = :after, total_earned = total_earned + :points WHERE user_id = :userId',
    { after, points, userId }
  );

  await connection.execute(
    `INSERT INTO points_logs (user_id, type, points, balance_before, balance_after, source_type, source_id, description)
     VALUES (:userId, 'earn', :points, :before, :after, :sourceType, :sourceId, :description)`,
    { userId, points, before, after, sourceType, sourceId, description }
  );
}
