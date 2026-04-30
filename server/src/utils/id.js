import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 8);

export function createUserCode() {
  const date = new Date();
  const y = String(date.getFullYear()).slice(2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `SMK${y}${m}${d}${nanoid()}`;
}

export function createInviteCode() {
  return `K${nanoid()}`;
}

export function createOrderNo(prefix = 'NO') {
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix}${time}${nanoid()}`;
}
