export async function findInviterByCode(connection, inviteCode) {
  if (!inviteCode) return null;

  const [[inviter]] = await connection.execute(
    'SELECT id, invite_code FROM users WHERE invite_code = :inviteCode AND status = \'normal\' LIMIT 1',
    { inviteCode }
  );

  return inviter || null;
}

export async function bindInviteRelation(connection, inviterUserId, inviteeUserId, inviteCode) {
  if (!inviterUserId || !inviteeUserId || inviterUserId === inviteeUserId) return;

  await connection.execute(
    `INSERT INTO invite_relations (inviter_user_id, invitee_user_id, invite_code, status)
     VALUES (:inviterUserId, :inviteeUserId, :inviteCode, 'pending')`,
    { inviterUserId, inviteeUserId, inviteCode }
  );
}
