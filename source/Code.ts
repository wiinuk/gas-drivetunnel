global.doGet = function () {
    Logger.log("get");
    return ContentService.createTextOutput("hello world");
};
