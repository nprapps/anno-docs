var login = require("@nprapps/google-login");
var { google } = require("googleapis");
var minimist = require("minimist");

var secrets = {
  VERB8TM_SRT_API: "",
  VERB8TM_TIMESTAMP_API: ""
};

for (var k in secrets) {
  secrets[k] = process.env["anno_docs_" + k];
}

var config = require("./app_config.json");
var apiId = "MmMXhvnD6H8NqA_izF7l3Z2GKoUaL1Yht";
var scriptId = config.script_project;

var auth = login.getClient();
var scriptAPI = google.script({ version: "v1", auth });

var tasks = {
  login: async function() {
    await login.authenticate([
      "https://www.googleapis.com/auth/script.projects",
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
    var cspanServer = `http://ec2-${config.server.replace(/\./g, "-")}.compute-1.amazonaws.com:5000/`;
    var parameters = [
      secrets.VERB8TM_SRT_API,
      secrets.VERB8TM_TIMESTAMP_API,
      cspanServer,
      true,
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
      console.log(JSON.stringify(result.data, null, 2));
    } catch (err) {
      console.error(err.details);
    }
  },
  metadata: async function() {
    var result = await scriptAPI.projects.get({
      scriptId
    });
    console.log(JSON.stringify(result.data, null, 2));
  }
}

var args = minimist(process.argv);
var [ node, here, task, ...params ] = args._;

if (tasks[task]) {
  tasks[task](args, params);
} else {
  console.log(`No matching task for ${task}`);
}