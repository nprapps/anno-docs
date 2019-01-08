var login = require("@nprapps/google-login");
var { google } = require("googleapis");
var minimist = require("minimist");

var args = minimist(process.argv);
var [ node, here, task, ...params ] = args._;

var log = data => console.log(JSON.stringify(data, null, 2));

var secrets = {
  VERB8TM_SRT_API: "",
  VERB8TM_TIMESTAMP_API: ""
};

for (var k in secrets) {
  secrets[k] = process.env["anno_docs_" + k];
}

var config = require("./app_config.json");
var scriptId = config.script_project;
var server = args.env == "production" ? config.production : config.staging;

var auth = login.getClient();
var scriptAPI = google.script({ version: "v1", auth });

var tasks = {
  login: async function() {
    await login.authenticate([
      "https://www.googleapis.com/auth/script.projects",
      "https://www.googleapis.com/auth/script.scriptapp",
      "https://www.googleapis.com/auth/script.deployments",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/script.external_request",
      "https://www.googleapis.com/auth/script.scriptapp",
      "https://www.googleapis.com/auth/script.send_mail",
      "https://www.googleapis.com/auth/spreadsheets"
    ]);
    process.exit();
  },
  setup: async function() {
    var cspanServer = `http://ec2-${server.replace(/\./g, "-")}.compute-1.amazonaws.com:5000/`;
    var parameters = [
      secrets.VERB8TM_SRT_API,
      secrets.VERB8TM_TIMESTAMP_API,
      cspanServer,
      config.cspan,
      config.transcript,
      config.log_sheet
    ];
    try {
      var result = await scriptAPI.scripts.run({
        auth,
        scriptId,
        resource: {
          function: "setup",
          parameters
        }
      });
      var { data } = result;
      if (data.error) {
        throw data.error;
      }
      log(result.data);
    } catch (err) {
      console.error(err.details);
    }
  },
  run: async function(argv, [f, ...params]) {
    var result = await scriptAPI.scripts.run({
      scriptId,
      resource: { function: f }
    });
    log(result.error || result.data);
  },
  metadata: async function() {
    var result = await scriptAPI.projects.get({
      scriptId
    });
    log(result.data);
  }
}

if (tasks[task]) {
  tasks[task](args, params);
} else {
  console.log(`No matching task for ${task}`);
}