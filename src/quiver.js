const fs = require('fs');
const path = require('path');
const del = require('del');

const FILE_META = 'meta.json';
const FILE_CONTENT = 'content.json';
const FILE_ESA = 'esa.json';
const QUIVER_NOTE_EXTENSION = "qvnote";
const QUIVER_BOOK_EXTENSION = "qvnotebook";

class QuiverNote {
	/* Fields:
			- meta.uuid: String
			- meta.title: String
			- meta.tags: [String]
			- meta.created_at: Number
			- meta.updated_at: Number
			- content.title: String
			- content.cells[0].data: String
	*/

	constructor(book, uuid) {
		this.book = book;
		const noteDir = path.join(this.book.dir, uuid + '.' + QUIVER_NOTE_EXTENSION);
		const metaFile = path.join(noteDir, FILE_META);
		const contentFile = path.join(noteDir, FILE_CONTENT);
		const esaFile = path.join(noteDir, FILE_ESA);

		try {
			const meta = fs.readFileSync(metaFile, 'utf-8');
			const content = fs.readFileSync(contentFile, 'utf-8');

			this.meta = JSON.parse(meta);
			this.content = JSON.parse(content);
		} catch (e) {
			this.meta = null;
			this.content = null;
		}

		try {
			const esa = fs.readFileSync(esaFile, 'utf-8');
			this.esa = JSON.parse(esa);
		} catch (e) {
			this.esa = null;
		}
	}

	static open(book, uuid) {
		const note = new QuiverNote(book, uuid);
		return note.meta ? note : null;
	}

	static create(book, uuid) {
		const note = new QuiverNote(book, uuid);
		if (note.meta) throw new Error('Note already exists');

		// templates
		note.meta = {
			created_at: Date.now() / 1000 | 0,
			tags: [],
			title: '',
			updated_at: Date.now() / 1000 | 0,
			uuid: uuid
		};
		note.content = {
			title: '',
			cells: [{
				type: 'markdown',
				data: ''
			}]
		};
		note.esa = null;

		return note;
	}

	setTitle(title) {
		if (typeof title !== 'string') return false;
		this.meta.title = title;
		this.content.title = title;
		return true;
	}

	setTags(tags) {
		if (!tags instanceof Array) return false;
		this.meta.tags = tags;
		return true;
	}

	setBody(body) {
		if (typeof body !== 'string') return false;
		this.content.cells = [{
			type: 'markdown',
			data: body
		}];
		return true;
	}

	setEsa(esa) {
		if (typeof esa !== 'object') return false;
		this.esa = esa;
		this.meta.created_at = Date.parse(esa.created_at) / 1000 | 0;
		this.meta.updated_at = Date.parse(esa.updated_at) / 1000 | 0;
		return true;
	}

	hasTag(target) {
		return this.meta.tags.some(tag => tag === target);
	}

	isUpdated() {
		const esaTime = Date.parse(this.esa.updated_at) / 1000 | 0;
		const metaTime = this.meta.updated_at;
		return esaTime !== metaTime;
	}

	save(makeDir = false) {
		const noteDir = path.join(this.book.dir, this.meta.uuid + '.' + QUIVER_NOTE_EXTENSION);
		const metaFile = path.join(noteDir, FILE_META);
		const contentFile = path.join(noteDir, FILE_CONTENT);
		const esaFile = path.join(noteDir, FILE_ESA);

		try {
			const metaJson = JSON.stringify(this.meta, null, '  ');
			const contentJson = JSON.stringify(this.content, null, '  ');
			const esaJson = JSON.stringify(this.esa, null, '  ');

			if (makeDir) {
				fs.mkdirSync(noteDir);
			}
			fs.writeFileSync(metaFile, metaJson, 'utf-8');
			fs.writeFileSync(contentFile, contentJson, 'utf-8');
			if (this.esa) {
				fs.writeFileSync(esaFile, esaJson, 'utf-8');
			}
			return true;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	remove() {
		const noteDir = path.join(this.book.dir, this.meta.uuid + '.' + QUIVER_NOTE_EXTENSION);
		del.sync(noteDir, {force: true});
	}
}

export default class QuiverBook {

	constructor(dir) {
		this.dir = dir;
		const metaFile = path.join(this.dir, FILE_META);

		try {
			const data = fs.readFileSync(metaFile, 'utf-8');
			const meta = JSON.parse(data);
			this.name = meta.name;
			this.uuid = meta.uuid;
		} catch (e) {
			this.dir = null;
			this.name = null;
			this.uuid = null;
		}
	}

	static open(dir) {
		const quiverBook = new QuiverBook(dir);
		if (quiverBook.dir && quiverBook.name) {
			return quiverBook;
		} else {
			return null;
		}
	}

	getNote(noteUuid) {
		return QuiverNote.open(this, noteUuid);
	}

	getAllNotes() {
		const files = fs.readdirSync(this.dir);
		const noteUuids = files.filter(file => file.split('.').pop() === QUIVER_NOTE_EXTENSION)
		                       .map(file => file.split('.').shift());
		const notes = noteUuids.map(uuid => QuiverNote.open(this, uuid));

		return notes;
	}

	newNote(noteUuid) {
		try {
			const note = QuiverNote.create(this, noteUuid);
			return note;
		} catch (e) {
			return null;
		}
	}

};
