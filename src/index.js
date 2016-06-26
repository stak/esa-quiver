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
	case "fetch":
	case "pull":
	case "clone":
	case "push":
	case "help":
}

// app.fetch().then(() => console.log('DONE'));

app.push().then(() => {
	console.log("DONE");
}).catch((err) => {
	console.log("ERR");
});

/*
console.log(app.splitNoteTitle_("hoge/img/page #what #is #this"));
console.log(app.splitNoteTitle_("hoge/img/page #img /#slash"));
console.log(app.splitNoteTitle_("dir/hoge/abe no haru #kasu #desu a a"));
*/