function logFiles() {
  var folder = DriveApp.getRootFolder()
  Logger.log("📂" + folder.getName() + ", " + folder.getId())

  var folders = DriveApp.getFolders()
  while (folders.hasNext()) {
    var d = folders.next()
    Logger.log("📂" + d.getName() + ", " + d.getId());
  }

  var files = DriveApp.getFiles()
  while (files.hasNext()) {
    var f = files.next()
    Logger.log("📄" + f.getName() + ", " + f.getId())
  }
}
function sandbox() {
  Logger.log("test")
  var folder = DriveApp.getRootFolder()
  var url = "http://www.google.com/maps/d/u/0/kml?forcekml=1&mid=1rurAkGACeZvBtxs9ipQvageuMseoszzk"
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true })
  if (response.getResponseCode() === 200) {
    var blob = response.getBlob()
    Logger.log(blob.getName() + ", " + blob.getContentType())
    blob.setName("kmap.kml")
    blob.setContentType("application/vnd.google-earth.kml+xml")
    folder.createFile(blob);
  }
}
function createMapFile() {
  var map = Maps.newStaticMap()
  // マップ画像を blob に変換する
  var blob = map.getAs("application/vnd.google-apps.map");
  // blob の名前を設定する
  blob.setName("myMap3");
  blob.setContentType("application/vnd.google-apps.map")
  // フォルダを開く
  var folder = DriveApp.getRootFolder()
  // フォルダに blob を保存する
  folder.createFile(blob);
}
function createCsv() {
  var content = "0,0";
  var blob = Utilities.newBlob(content, "text/csv", "sample.csv");
  DriveApp.getRootFolder().createFile(blob);
}
function countUp() {
  // CSVファイルのIDを指定
  var fileId = "1ib3S-mavBtM9DM9dz4z7RlDGGQY-2aJz";
  // ファイルを開く
  var file = DriveApp.getFileById(fileId);
  // ファイルの内容を取得
  var content = file.getBlob().getDataAsString();
  Logger.log(content);
  // 改行で分割して配列にする
  var lines = content.split("\n");
  // 最後の行を取得
  var lastLine = lines[lines.length - 1];
  // カンマで分割して配列にする
  var values = lastLine.split(",");
  // 右から二番目の数値を取得
  var num = values[values.length - 2];
  // 数値を1増やす
  num++;
  // 増やした数値を文字列に変換して配列に代入
  values[values.length - 2] = num.toString();
  // 配列をカンマで結合して文字列にする
  var newLine = values.join(",");
  // 改行を追加してファイルに追記する
  file.setContent("\n" + newLine);
}
function createKml() {
  var kml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '  <Document>',
    '  </Document>',
    '</kml>'
  ].join("\n");
  // kml 文字列を blob に変換
  var blob = Utilities.newBlob(kml, "application/vnd.google-apps.map", "MyMap2");
  DriveApp.getRootFolder().createFile(blob);
}
function updateKml() {
  var file = DriveApp.getFileById("1fBhWpqfWA_lThmVDSpQBp4WljQ2P1_jm");
  // ファイルの内容を取得
  var content = file.getBlob().getDataAsString();
  Logger.log(JSON.stringify(content));
  file.setContent(content + "\n");
}
