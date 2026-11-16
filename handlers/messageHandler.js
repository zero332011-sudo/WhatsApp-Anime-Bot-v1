import { getText } from '../utils/helpers.js';
import { commandHandler } from './commandHandler.js';
import { filterMessage } from '../system/filter.js';
import { guessMessage } from '../games/guess.js';
import { xoMessage } from '../games/xo.js';
import { getDB, saveDB } from '../database/db.js';
import { rememberOwnerIdentity } from '../utils/permissions.js';

export async function messageHandler(sock, update) {
  for (const m of update.messages || []) {
    if (!m.message || m.key.fromMe || m.key.remoteJid === 'status@broadcast') continue;
    const jid = m.key.remoteJid;
    const text = getText(m);
    rememberOwnerIdentity(m);

    try {
      const db = getDB();
      if (jid.endsWith('@g.us')) {
        db.messageStats[jid] ||= { total: 0, members: {} };
        db.messageStats[jid].total++;
        const sender = m.key.participant || jid;
        db.messageStats[jid].members[sender] = (db.messageStats[jid].members[sender] || 0) + 1;
        if (!db.groups[jid]) {
        db.groups[jid] = { prayerEnabled: false };
        saveDB(db);
        }
        saveDB(db);
      }

      if (await filterMessage(sock, m, text)) continue;
      if (text && await xoMessage(sock, m, text)) continue;
      if (text && await guessMessage(sock, m, text)) continue;
      if (text) await commandHandler(sock, m, text);
    } catch (error) {
      console.error('Message handler:', error);
    }
  }
}
