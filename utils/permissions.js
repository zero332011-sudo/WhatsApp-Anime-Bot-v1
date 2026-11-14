import { config } from '../config/settings.js';
import { getDB } from '../database/db.js';
import { jidNumber } from './helpers.js';
export const isOwner = jid => !!config.owner && jidNumber(jid) === config.owner;
export function isDeveloper(jid) { const db=getDB(); return isOwner(jid) || db.developers.some(x=>jidNumber(x)===jidNumber(jid)); }
