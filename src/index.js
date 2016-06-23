import EsaQuiver from './esa-quiver';

const config = {
	esaTeam: process.env['ESA_CURRENT_TEAM'],
	esaToken: process.env['ESA_ACCESS_TOKEN'],
	quiverDir: process.env['QUIVER_NOTEBOOK_DIR']
};

const app = EsaQuiver.init(config);
if (!app) {
	console.error("Failed to initialize EsaQuiver.");
	process.exit(1);
}

app.fetch();