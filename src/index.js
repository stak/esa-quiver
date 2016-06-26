import EsaQuiver from './esa-quiver';

const config = {
	esaTeam: process.env['ESA_CURRENT_TEAM'],
	esaToken: process.env['ESA_ACCESS_TOKEN'],
	quiverDir: process.env['QUIVER_NOTEBOOK_DIR'],
	tagPrefix: ''
};

const app = EsaQuiver.open(config);
if (!app) {
	console.error("Failed to initialize EsaQuiver.");
	process.exit(1);
}

const cmd = process.argv[2] || "help";
switch (cmd.toLowerCase()) {
	case "init": // remove all existing notes in local
		app.init().then(() => console.log("DONE"));
		break;
	case "fetch": // fetch from esa.io, but skip if the local note has changes
		app.fetch().then(() => console.log('DONE'));
		break;
	case "pull": // fetch from esa.io, and overwrite even if the local note has changes
		app.fetch(true).then(() => console.log('DONE'));
		break;
	case "push": // push to esa.io; local and remote changes will be merged automatically
		app.push().then(() => {
			console.log("DONE");
		}).catch((err) => {
			console.log(err);
		});
		break;
	case "help":
	default:
		console.log("Usage: esa-quiver <command>\n\n" +
		            "where <command> is one of:\n" +
		            "\tinit, fetch, pull, push, help");
		break;
}
