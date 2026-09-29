import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { t } from '../i18n/core.js';
import { formatDate, formatTimeRange, formatDateTime } from './format';

// Builds an .xlsx of an event's finances and opens the share sheet (Files, Zalo, email, Drive...).
//
// The workbook is made for manual calculation: every total is a live Excel FORMULA, and the
// fixed costs on the Summary sheet are plain numbers the host can overtype to run "what if"
// scenarios (e.g. a different fee per player). Flags are 1/0 so formulas work in any language.

const NUM_FMT = '#,##0';
const num = (v, f) => ({ t: 'n', v: Number(v) || 0, z: NUM_FMT, ...(f ? { f } : {}) });
const str = (v) => ({ t: 's', v: String(v ?? '') });
const quote = (name) => `'${name.replace(/'/g, "''")}'`;

export function buildEventWorkbook({ event, payers, expenses }) {
  const nSummary = t('xl.summary');
  const nPlayers = t('xl.players');
  const nExpenses = t('xl.expenses');
  const P = quote(nPlayers);
  const X = quote(nExpenses);

  const feeOf = (p) => Number(p.fee_amount ?? event.fee_amount) || 0;

  // ---- Players sheet -------------------------------------------------------
  const n = payers.length;
  const pRows = payers.map((p, i) => {
    const r = i + 2; // Excel row (row 1 is the header)
    const owed = feeOf(p);
    const paid = p.fee_paid ? 1 : 0;
    return [
      num(i + 1), str(p.display_name), str(p.phone || ''), str(t(`status.${p.status}`)),
      num(owed), num(paid), num(owed * paid, `E${r}*F${r}`), num(owed - owed * paid, `E${r}-G${r}`),
      num(p.status === 'checked_in' ? 1 : 0),
    ];
  });
  const sum = (col, pick) => payers.reduce((a, p, i) => a + pick(p, i), 0);
  const owedTotal = sum('E', (p) => feeOf(p));
  const collectedTotal = sum('G', (p) => (p.fee_paid ? feeOf(p) : 0));
  const paidCount = payers.filter((p) => p.fee_paid).length;
  const checkedCount = payers.filter((p) => p.status === 'checked_in').length;
  const pTotalRow = n + 2;
  const range = (col) => `${col}2:${col}${n + 1}`;
  const pTotals = [
    str(''), str(t('xl.total')), str(''), str(''),
    num(owedTotal, n ? `SUM(${range('E')})` : undefined),
    num(paidCount, n ? `SUM(${range('F')})` : undefined),
    num(collectedTotal, n ? `SUM(${range('G')})` : undefined),
    num(owedTotal - collectedTotal, n ? `SUM(${range('H')})` : undefined),
    num(checkedCount, n ? `SUM(${range('I')})` : undefined),
  ];
  const wsPlayers = XLSX.utils.aoa_to_sheet([
    [t('xl.no'), t('xl.name'), t('xl.phone'), t('xl.status'), t('xl.feeOwed'), t('xl.paid'), t('xl.collected'), t('xl.outstanding'), t('xl.checkedIn')].map(str),
    ...pRows,
    pTotals,
  ]);
  wsPlayers['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 15 }, { wch: 14 }, { wch: 13 }, { wch: 14 }, { wch: 13 }, { wch: 13 }, { wch: 13 }];

  // ---- Expenses sheet ------------------------------------------------------
  const m = expenses.length;
  const eRows = expenses.map((x, i) => {
    const r = i + 2;
    const voided = x.is_voided ? 1 : 0;
    const amount = Number(x.amount) || 0;
    return [num(i + 1), str(x.description || ''), str(formatDateTime(x.created_at)), num(amount), num(voided), num(amount * (1 - voided), `D${r}*(1-E${r})`)];
  });
  const expensesCounted = expenses.reduce((a, x) => a + (x.is_voided ? 0 : Number(x.amount) || 0), 0);
  const eTotalRow = m + 2;
  const wsExpenses = XLSX.utils.aoa_to_sheet([
    [t('xl.no'), t('xl.description'), t('xl.date'), t('xl.amount'), t('xl.voided'), t('xl.counted')].map(str),
    ...eRows,
    [str(''), str(t('xl.total')), str(''), str(''), str(''), num(expensesCounted, m ? `SUM(F2:F${m + 1})` : undefined)],
  ]);
  wsExpenses['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 18 }, { wch: 13 }, { wch: 16 }, { wch: 13 }];

  // ---- Summary sheet (formulas point at the other sheets) --------------------
  const court = Number(event.court_cost) || 0;
  const balls = Number(event.ball_cost) || 0;
  const totalCosts = court + balls + expensesCounted;
  const profit = collectedTotal - totalCosts;
  const rows = [
    [str(event.title)],
    [str(`${formatDate(event.event_date)} · ${formatTimeRange(event.start_time, event.end_time)}${event.location ? ` · ${event.location}` : ''}`)],
    [],
    [str(t('xl.item')), str(t('xl.amount'))],
    [str(t('xl.feesExpected')), num(owedTotal, `${P}!E${pTotalRow}`)],           // row 5
    [str(t('xl.feesCollected')), num(collectedTotal, `${P}!G${pTotalRow}`)],     // row 6
    [str(t('xl.feesOutstanding')), num(owedTotal - collectedTotal, `${P}!H${pTotalRow}`)], // row 7
    [str(t('xl.courtCost')), num(court)],                                        // row 8  (editable)
    [str(t('xl.ballCost')), num(balls)],                                         // row 9  (editable)
    [str(t('xl.otherExpenses')), num(expensesCounted, `${X}!F${eTotalRow}`)],    // row 10
    [str(t('xl.totalCosts')), num(totalCosts, 'B8+B9+B10')],                     // row 11
    [str(t('xl.profitLoss')), num(profit, 'B6-B11')],                            // row 12
    [],
    [str(t('xl.stats')), str('')],                                               // row 14
    [str(t('xl.playersCount')), num(n)],                                         // row 15
    [str(t('xl.paidCount')), num(paidCount, `${P}!F${pTotalRow}`)],              // row 16
    [str(t('xl.checkedInCount')), num(checkedCount, `${P}!I${pTotalRow}`)],      // row 17
    [str(t('xl.costPerCheckedIn')), num(checkedCount ? totalCosts / checkedCount : 0, 'IF(B17>0,B11/B17,0)')],
    [str(t('xl.breakEvenFee')), num(n ? totalCosts / n : 0, 'IF(B15>0,B11/B15,0)')],
    [],
    [str(t('xl.note'))],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(rows);
  wsSummary['!cols'] = [{ wch: 38 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, nSummary);
  XLSX.utils.book_append_sheet(wb, wsPlayers, nPlayers);
  XLSX.utils.book_append_sheet(wb, wsExpenses, nExpenses);
  return wb;
}

// "Kèo tối thứ 7" -> "Keo-toi-thu-7"
export function safeFilename(text) {
  const base = String(text || 'event')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return base || 'event';
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function exportEventFinance({ event, payers, expenses }) {
  if (!(await Sharing.isAvailableAsync())) {
    const err = new Error('Sharing is not available on this device.');
    err.code = 'SHARE_UNAVAILABLE';
    throw err;
  }

  const wb = buildEventWorkbook({ event, payers, expenses });
  const filename = `${safeFilename(event.title)}_${event.event_date}.xlsx`;

  let uri;
  if (FileSystem.File && FileSystem.Paths) {
    // Expo SDK 54+ (new file API)
    const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    const file = new FileSystem.File(FileSystem.Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(bytes);
    uri = file.uri;
  } else {
    // Expo SDK 53 and older
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    uri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  }

  await Sharing.shareAsync(uri, {
    mimeType: XLSX_MIME,
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: t('finance.exportDialog'),
  });
  return filename;
}
