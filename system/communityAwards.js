import { getDB, saveDB } from '../database/db.js';

const TIME_ZONE = process.env.TIMEZONE || 'Africa/Cairo';
const DAILY_HOUR = Number(process.env.AWARD_DAILY_HOUR ?? 23);
const DAILY_MINUTE = Number(process.env.AWARD_DAILY_MINUTE ?? 59);
const WEEKLY_DAY = Number(process.env.AWARD_WEEKLY_DAY ?? 5); // Friday
const WEEKLY_HOUR = Number(process.env.AWARD_WEEKLY_HOUR ?? 23);
const WEEKLY_MINUTE = Number(process.env.AWARD_WEEKLY_MINUTE ?? 59);
const TICK_MS = 30_000;

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
}

function dateKey(p) {
  return `${p.year}-${p.month}-${p.day}`;
}

function weekKey(p) {
  const date = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const daysSinceSaturday = (date.getUTCDay() + 1) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceSaturday);
  return date.toISOString().slice(0, 10);
}

function sortMembers(bucket) {
  return Object.entries(bucket?.members || {}).sort((a, b) => b[1] - a[1]);
}

function mentionLabel(jid) {
  return '@' + String(jid).split('@')[0].split(':')[0];
}

async function sendMemberList(sock, groupJid, heading, rows, extraLines = []) {
  const pageSize = 18;
  const pages = [];
  for (let i = 0; i < rows.length; i += pageSize) pages.push(rows.slice(i, i + pageSize));
  if (!pages.length) pages.push([]);
  for (let page = 0; page < pages.length; page++) {
    const current = pages[page];
    const lines = current.map(([jid, count], index) =>
      `${page * pageSize + index + 1}. ${mentionLabel(jid)} — ${count} رسالة`
    );
    const text = [
      heading,
      ...extraLines,
      current.length ? lines.join('\n') : 'لا توجد رسائل مسجلة خلال الفترة.',
      pages.length > 1 ? `صفحة ${page + 1} من ${pages.length}` : ''
    ].filter(Boolean).join('\n');
    await sock.sendMessage(groupJid, {
      text,
      mentions: current.map(([jid]) => jid)
    });
  }
}

async function participatingCommunityGroups(sock) {
  const all = await sock.groupFetchAllParticipating();
  const groups = Object.values(all || {});
  const communityIds = new Set(groups.filter(g => g.isCommunity).map(g => g.id));
  return groups.filter(g => g.id?.endsWith('@g.us') && g.linkedParent &&
    (communityIds.size === 0 || communityIds.has(g.linkedParent)));
}

async function sendDailyAwards(sock, groups, day) {
  const db = getDB();
  for (const group of groups) {
    const bucket = db.messageStats?.[group.id]?.daily?.[day];
    const ranking = sortMembers(bucket);
    if (!ranking.length) continue;
    const [winner, count] = ranking[0];
    const text = [
      '🏅 نتيجة نشاط اليوم',
      `👥 المجموعة: ${group.subject || group.id}`,
      `🥇 الفائز: ${mentionLabel(winner)}`,
      `💬 عدد رسائله: ${count}`,
      '🎁 الجائزة المعلنة: 100 جنيه',
      '📌 يتولى المطور ترتيب تسليم الجائزة.'
    ].join('\n');
    await sock.sendMessage(group.id, { text, mentions: [winner] });
  }
}

async function sendWeeklyCommunityReports(sock, groups, week) {
  const byCommunity = new Map();
  for (const group of groups) {
    const parent = group.linkedParent;
    if (!byCommunity.has(parent)) byCommunity.set(parent, []);
    byCommunity.get(parent).push(group);
  }

  const db = getDB();
  for (const [communityJid, communityGroups] of byCommunity) {
    const totals = communityGroups.map(group => ({
      group,
      bucket: db.messageStats?.[group.id]?.weekly?.[week] || { total: 0, members: {} }
    })).sort((a, b) => (b.bucket.total || 0) - (a.bucket.total || 0));

    const winner = totals.find(x => x.bucket.total > 0);
    const winnerName = winner?.group.subject || winner?.group.id || 'لا يوجد فائز';
    for (const item of totals) {
      const groupName = item.group.subject || item.group.id;
      const extra = [
        `🏘️ المجتمع: ${communityJid}`,
        `📊 إجمالي رسائل المجموعة هذا الأسبوع: ${item.bucket.total || 0}`,
        winner
          ? `🏆 المجموعة الفائزة: ${winnerName} — ${winner.bucket.total} رسالة`
          : 'لم يتم تسجيل نشاط كافٍ لتحديد مجموعة فائزة.',
        winner
          ? '💰 جائزة المجتمع: 10,000 جنيه للمجموعة الفائزة، والمطور يتولى توزيعها.'
          : ''
      ].filter(Boolean);
      await sendMemberList(
        sock,
        item.group.id,
        `📅 التقرير الأسبوعي — ${groupName}`,
        sortMembers(item.bucket),
        extra
      );
    }
  }
}

export function startCommunityAwards(sock) {
  let running = false;

  const tick = async () => {
    if (running) return;
    const now = localParts();
    const today = dateKey(now);
    const thisWeek = weekKey(now);
    const db = getDB();
    db.communityAwards ||= { lastDailyRun: '', lastWeeklyRun: '' };

    const dailyDue = Number(now.hour) === DAILY_HOUR &&
      Number(now.minute) >= DAILY_MINUTE &&
      db.communityAwards.lastDailyRun !== today;
    const weeklyDue = Number(now.weekday === 'Fri' ? 5 :
      ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Sat: 6, Sun: 7 }[now.weekday] || 0)) === WEEKLY_DAY &&
      Number(now.hour) === WEEKLY_HOUR &&
      Number(now.minute) >= WEEKLY_MINUTE &&
      db.communityAwards.lastWeeklyRun !== thisWeek;

    if (!dailyDue && !weeklyDue) return;
    running = true;
    try {
      const groups = await participatingCommunityGroups(sock);
      if (dailyDue) {
        await sendDailyAwards(sock, groups, today);
        db.communityAwards.lastDailyRun = today;
      }
      if (weeklyDue) {
        await sendWeeklyCommunityReports(sock, groups, thisWeek);
        db.communityAwards.lastWeeklyRun = thisWeek;
      }
      saveDB(db);
    } catch (error) {
      console.error('تعذر إرسال تقارير وجوائز المجتمع:', error?.stack || error);
    } finally {
      running = false;
    }
  };

  tick().catch(error => console.error('Community awards scheduler:', error));
  const timer = setInterval(() => {
    tick().catch(error => console.error('Community awards scheduler:', error));
  }, TICK_MS);
  timer.unref?.();
  console.log(`🏆 نظام جوائز المجتمع جاهز — يومي ${String(DAILY_HOUR).padStart(2, '0')}:${String(DAILY_MINUTE).padStart(2, '0')}، أسبوعي الجمعة ${String(WEEKLY_HOUR).padStart(2, '0')}:${String(WEEKLY_MINUTE).padStart(2, '0')} (${TIME_ZONE})`);
  return () => clearInterval(timer);
}
