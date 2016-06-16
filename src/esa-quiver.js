const esaLib = require('esa-nodejs');
import QuiverBook from './quiver';

export default class EsaQuiver {

	constructor(config) {
		this.esa = esaLib({
			team: config.esaTeam,
			accessToken: config.esaToken
		});
		this.qv = new QuiverBook(config.quiverDir);

		this.isReady_ = config.esaTeam &&
			             config.esaToken &&
									 this.qv.name;
	}

	isReady() {
		return this.isReady_;
	}

	fetch() {
		if (!this.isReady()) throw new Error();

		esa.api.posts({per_page: 1, page: 1}, function(err, res) {
			console.log(res.body);
		});
	}

	push() {
		if (!this.isReady()) throw new Error();

	}
};
