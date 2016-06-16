import EsaQuiver from './esa-quiver';

const config = {
	esaTeam: process.env['ESA_CURRENT_TEAM'],
	esaToken: process.env['ESA_ACCESS_TOKEN'],
	quiverDir: process.env['QUIVER_NOTEBOOK_DIR']
};

const app = new EsaQuiver(config);
if (!app.isReady()) {
	console.error("Failed to initialize EsaQuiver.");
	process.exit(1);
}

esa.api.posts({per_page: 1, page: 1}, function(err, res) {
  console.log(res.body);
});
