var TZ = 'Asia/Tehran';
var ADMIN_KEY = 'takhassos1405';

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'list') return json_({ok:true, items:listItems()});
  return json_({ok:true, service:'takhassosyab'});
}

function doPost(e) {
  var data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) { data = e.parameter || {}; }
  if (data.action === 'save') { saveShared(data); return json_({ok:true}); }
  if (data.action === 'delete') {
    if (data.key !== ADMIN_KEY) return json_({ok:false});
    markDeleted(data.id);
    return json_({ok:true});
  }
  saveForm_(data);
  if (data.type === 'employer' || (data.type === 'jobseeker' && data.public === 'بله')) saveShared(data);
  return json_({ok:true});
}

function saveForm_(data) {
  var tabs = {employer:'کارفرما', jobseeker:'کارجو', membership:'عضویت'};
  var name = tabs[data.type] || 'کارفرما';
  var sh = sheet_(name, ['تاریخ','نوع','عنوان','متن','تماس','اجازه']);
  sh.appendRow([fmt_(), data.type || '', data.title || data.name || '', data.text || '', data.contact || '', data.public || '']);
}

function saveShared(data) {
  var sh = sheet_('فهرست', ['id','type','title','text','public','deleted']);
  sh.appendRow([data.id || new Date().getTime(), data.type || '', data.title || data.name || '', data.text || '', data.public || '', '']);
}

function markDeleted(id) {
  var sh = SpreadsheetApp.getActive().getSheetByName('فهرست');
  if (!sh) return;
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (String(rows[i][0]) === String(id)) sh.getRange(i + 1, 6).setValue('بله');
}

function listItems() {
  var sh = SpreadsheetApp.getActive().getSheetByName('فهرست');
  if (!sh) return [];
  var rows = sh.getDataRange().getValues(), out = [], i;
  for (i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    out.push({id:String(rows[i][0]), type:rows[i][1], title:rows[i][2], text:rows[i][3], public:rows[i][4], deleted:rows[i][5]});
  }
  return out;
}

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (!sh.getLastRow()) sh.appendRow(headers);
  return sh;
}

function fmt_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
