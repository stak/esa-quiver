const fs = require('fs');
const path = require('path');

const FILE_META = 'meta.json';
const FILE_CONTENT = 'content.json';

export default class QuiverBook {

	constructor(dir) {
		this.dir = dir;
		const metaFile = path.join(this.dir, FILE_META);

		try {
			const data = fs.readFileSync(metaFile, 'utf-8');
			const meta = JSON.parse(data);
			this.name = meta.name;
		} catch (e) {
			this.dir = null;
			this.name = null;
		}
	}

	getNote(noteUuid) {

	}

	getNoteWithTitle(noteTitle) {

	}

	addNote(noteUuid) {

	}

};
