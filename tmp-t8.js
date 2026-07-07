const { spawn } = require("child_process");
const path = require("path");
const oc = path.join(path.dirname(process.execPath), "opencode.cmd");
function q(v){return `"${String(v).replace(/"/g,'\\"')}"`;}
// exact form we intend to ship: full command line as single string + shell:true, no args array
const promptPath = "E:\program\ai-ui-agentic\data\ai-coding-console\tasks\T-20260706-001\runs\RUN-20260708-001-plan\prompt.md";
const cmdLine = [q(oc),"run",q("Plan-only run T-20260706-001"),"--format","json","--file",q(promptPath)].join(" ");
console.log("=== T8: spawn(fullCommandLine, {shell:true}), 45s ===");
const child = spawn(cmdLine, { cwd: "E:\program\kiro-stage-d-test", shell:true, windowsHide:true, stdio:["pipe","pipe","pipe"] });
let out="",err="";
child.stdout.on("data",d=>out+=d);
child.stderr.on("data",d=>err+=d);
child.stdin.end();
const to=setTimeout(()=>{console.log("TIMEOUT");try{child.kill();}catch{}},45000);
child.on("close",(code)=>{clearTimeout(to);console.log("exit=",code,"outLen=",out.length);console.log(out.slice(0,400));if(err)console.log("stderr:",err.slice(0,300));});
