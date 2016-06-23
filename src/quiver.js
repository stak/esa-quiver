const fs = require('fs');
const path = require('path');

const FILE_META = 'meta.json';
const FILE_CONTENT = 'content.json';
const QUIVER_NOTE_EXTENSION = ".qvnote";
const QUIVER_BOOK_EXTENSION = ".qvnotebook";

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
		const noteDir = path.join(this.book.dir, uuid + QUIVER_NOTE_EXTENSION);
		const metaFile = path.join(noteDir, FILE_META);
		const contentFile = path.join(noteDir, FILE_CONTENT);

		try {
			const meta = fs.readFileSync(metaFile, 'utf-8');
			const content = fs.readFileSync(contentFile, 'utf-8');

			this.meta = JSON.parse(data);
			this.content = JSON.parse(content);
		} catch (e) {
			this.meta = null;
			this.content = null;
		}
	}

	static open(book, uuid) {
		const note = new QuiverNote(book, uuid);
		return note.meta ? note : null;
	}

	static create(book, uuid) {
		const note = new QuiverNote(book, uuid);
		if (note.meta) throw new Error('Note already exists');

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

		if (!note.save(true)) {
			throw new Error('Failed to create the note dir.');
		}
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

	save(makeDir = false) {
		const noteDir = path.join(this.book.dir, this.meta.uuid + QUIVER_NOTE_EXTENSION);
		const metaFile = path.join(noteDir, FILE_META);
		const contentFile = path.join(noteDir, FILE_CONTENT);

		const oldUpdateTime = this.meta.updated_at;
		this.meta.updated_at = Date.now() / 1000 | 0;

		try {
			const metaJson = JSON.stringify(this.meta, null, '  ');
			const contentJson = JSON.stringify(this.content, null, '  ');

			if (makeDir) {
				fs.mkdirSync(noteDir);
			}
			fs.writeFileSync(metaFile, metaJson, 'utf-8');
			fs.writeFileSync(contentFile, contentJson, 'utf-8');
			return true;
		} catch (e) {
			console.log(e);
			this.meta.updated_at = oldUpdateTime;
			return false;
		}
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
		} catch (e) {
			this.dir = null;
			this.name = null;
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

	}

	addNote(noteUuid) {
		try {
			const note = QuiverNote.create(this, noteUuid);
			return note;
		} catch (e) {
			return null;
		}
	}

};
