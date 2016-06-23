const esaLib = require('esa-nodejs');
import QuiverBook from './quiver';

export default class EsaQuiver {

	constructor(config) {
		this.esa = esaLib({
			team: config.esaTeam,
			accessToken: config.esaToken
		});
		this.book = QuiverBook.open(config.quiverDir);
	}

	static init(config) {
		const esaQuiver = new EsaQuiver(config);
		if (esaQuiver.book && config.esaTeam && config.esaToken) {
			return esaQuiver;
		} else {
			return null;
		}
	}

	fetch() {
		this.esa.api.posts({per_page: 1, page: 1}, (err, res) => {
			console.log(res.body);
			const note = this.book.addNote('test');
			if (note) { 
				note.setTitle("Hi everyone");
				note.setBody("body test");
				note.save();
			}
		});
	}

	push() {

	}
};
