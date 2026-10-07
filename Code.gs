var SHEET_ID = "1Ye5rMKG_kn6GxoNOzClDYQPuk7u38USJSg8_sBVMCjE";
var ADMIN_KEY = "takhassos1405";
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === "list") return json({ok:true, items:listItems()});
  return json({ok:true, service:"takhassosyab"});
}
function doPost(e) {
  var data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) { data = e.parameter || {}; }
  if (data.action === "delete") {
    if (data.key !== ADMIN_KEY) return json({ok:false});
    markDeleted(data.id);
    return json({ok:true});
  }
  saveItem(data);
  return json({ok:true});
}
function listItems() {
  var sh = sheet("فهرست");
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    out.push({id:String(rows[i][0]), type:rows[i][1], title:rows[i][2], text:rows[i][3], public:rows[i][4], deleted:rows[i][5]});
  }
  return out;
}
function saveItem(data) {
  var sh = sheet("فهرست");
  sh.appendRow([data.id || new Date().getTime(), data.type || "", data.title || "", data.text || "", data.public || "", ""]);
}
function markDeleted(id) {
  var sh = sheet("فهرست");
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (String(rows[i][0]) === String(id)) sh.getRange(i+1, 6).setValue("بله");
}
function sheet(name) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(["id","type","title","text","public","deleted"]); }
  return sh;
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


function saveShared(data) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("فهرست");
  if (!sh) {
    sh = ss.insertSheet("فهرست");
    sh.appendRow(["id","type","title","text","public","deleted"]);
  }
  sh.appendRow([data.id || new Date().getTime(), data.type || "", data.title || "", data.text || "", data.public || "", ""]);
}

// در doPost، قبل از ذخیره فرم، اگر data.action برابر save بود saveShared(data) را صدا بزن و برگرد.
