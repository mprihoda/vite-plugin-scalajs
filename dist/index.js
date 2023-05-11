import { spawn } from "child_process";
// Utility to invoke a given sbt task and fetch its output
function printSbtTask(task, cwd, launcher) {
    const args = ["--batch", "-no-colors", "-Dsbt.supershell=false", `print ${task}`];
    const options = {
        cwd: cwd,
        stdio: ['ignore', 'pipe', 'inherit'],
    };
    const child = process.platform === 'win32'
        ? spawn(launcher || "sbt.bat", args.map(x => `"${x}"`), { shell: true, ...options })
        : spawn(launcher || "sbt", args, options);
    let fullOutput = '';
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', data => {
        fullOutput += data;
        process.stdout.write(data); // tee on my own stdout
    });
    return new Promise((resolve, reject) => {
        child.on('error', err => {
            reject(new Error(`sbt invocation for Scala.js compilation could not start. Is it installed?\n${err}`));
        });
        child.on('close', code => {
            if (code !== 0)
                reject(new Error(`sbt invocation for Scala.js compilation failed with exit code ${code}.`));
            else {
                // SBTN does send ANSI escape codes even with -no-color, and adds extra log message at the end
                // Filter out all lines that start with an escape code and logs (starting with [), take last line
                resolve(fullOutput.trimEnd().split('\n').filter(line => !/^\x1b?\[/.test(line)).at(-1));
            }
        });
    });
}
export default function scalaJSPlugin(options = {}) {
    const { cwd, projectID, uriPrefix, launcher } = options;
    const fullURIPrefix = uriPrefix ? (uriPrefix + ':') : 'scalajs:';
    let isDev = undefined;
    let scalaJSOutputDir = undefined;
    return {
        name: "scalajs:sbt-scalajs-plugin",
        // Vite-specific
        configResolved(resolvedConfig) {
            isDev = resolvedConfig.mode === 'development';
        },
        // standard Rollup
        async buildStart(options) {
            if (isDev === undefined)
                throw new Error("configResolved must be called before buildStart");
            const task = isDev ? "fastLinkJSOutput" : "fullLinkJSOutput";
            const projectTask = projectID ? `${projectID}/${task}` : task;
            scalaJSOutputDir = await printSbtTask(projectTask, cwd, launcher); /*.then(() => {
              return new Promise(resolve => setTimeout(resolve, 1000));
            });*/
        },
        // standard Rollup
        resolveId(source, importer, options) {
            if (scalaJSOutputDir === undefined)
                throw new Error("buildStart must be called before resolveId");
            if (!source.startsWith(fullURIPrefix))
                return null;
            const path = source.substring(fullURIPrefix.length);
            return `${scalaJSOutputDir}/${path}`;
        },
    };
}
