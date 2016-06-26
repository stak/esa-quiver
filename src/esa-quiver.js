const esaLib = require('esa-nodejs');
const crypto = require('crypto');
import QuiverBook from './quiver';

const ESA_UUID_PREFIX = 'esa-';
const ESA_TAG_DEFAULT_PREFIX = '${TEAM}';
const ESA_TAG_ATTR_WIP = 'wip';
const ESA_TAG_ATTR_NOTICE = 'notice';
const ESA_PAGE_PER_REQUEST = 100;
const ESA_MSG_SKIP_NOTICE = ' [skip notice]';

const PostState = {
	LATEST: Symbol('latest'),
	NEW: Symbol('new'),
	UPDATE: Symbol('update'),
	BOTH_UPDATED: Symbol('both')
};

function makeMd5Uuid(src) {
  const md5hash = crypto.createHash('md5');
  md5hash.update(src, 'binary');
  const md5str = md5hash.digest('hex').toUpperCase();

	// generate UUID like hyphened string in the form 8-4-4-4-12
	return md5str.slice(0, 8) + '-' +
	       md5str.slice(8, 12) + '-' +
	       md5str.slice(12, 16) + '-' +
	       md5str.slice(16, 20) + '-' +
	       md5str.slice(20);
}

export default class EsaQuiver {

	constructor(config) {
		this.esa = esaLib({
			team: config.esaTeam,
			accessToken: config.esaToken
		});
		this.book = QuiverBook.open(config.quiverDir);

		this.tagPrefix = (typeof config.tagPrefix === 'string' ?
		                 config.tagPrefix:
		                 ESA_TAG_DEFAULT_PREFIX)
		                 .replace('${TEAM}', this.esa.team);
	}

	static init(config) {
		const esaQuiver = new EsaQuiver(config);
		if (esaQuiver.book && config.esaTeam && config.esaToken) {
			return esaQuiver;
		} else {
			return null;
		}
	}

	fetch(page = 1, merge = false) {
		return new Promise((resolve, reject) => {
			const params = {
				per_page: ESA_PAGE_PER_REQUEST,
				page: page
			};
			this.esa.api.posts(params, (err, res) => {
				if (err) return reject(err);

				let syncContinue = true;
				res.body.posts.forEach(post => {
					switch (this.getPostState_(post)) {
						case PostState.LATEST:
							console.log(`Pass: ${post.full_name}`);
							syncContinue = false;
							break;
						case PostState.NEW:
							console.log(`New: ${post.full_name}`);
							this.savePost_(post);
							break;
						case PostState.UPDATE:
							console.log(`Update: ${post.full_name}`);
							this.savePost_(post);
							break;
						case PostState.BOTH_UPDATED:
							if (merge) {
								console.log(`Merge: ${post.full_name}`);
								// TODO: merge
							} else {
								console.log(`Skip: ${post.full_name}`);
							}
							break;
						default:
							reject('Unknown PostState');
							break;
					}
				});
				if (syncContinue && res.body.next_page) {
					// async recursion to fetch all updated pages
					this.fetch(res.body.next_page, merge)
					    .then(resolve, reject);
				} else {
					resolve();
				}
			});
		});
	}

	push() {
		const promises = this.collectNotesToPush_(this.book.getAllNotes());

		return new Promise((resolve, reject) => {
			Promise.all(promises).then(results => {
				results.forEach(res => {
					const post = res.body;
					const note = res.note;
					let eventName;
					const isMerged = post.revision_number !== note.esa.revision_number + 1;

					switch (this.getPostState_(post)) {
						case PostState.NEW:
								this.savePost_(post);
								note.remove();
								eventName = 'Create';
								break;
						case PostState.BOTH_UPDATED:
							this.savePost_(post);

							if (post.overlapped) {
								eventName = 'Conflict';
							} else if (isMerged) {
								eventName = 'Merged';
							} else {
								eventName = 'Push';
							}
							break;
						case PostState.LATEST:
						case PostState.UPDATE:
							reject('Push failed');
							break;
						default:
							reject('Unknown PostState');
							break;
					}
					console.log(`${eventName}: ${post.full_name}`);
				});
				resolve();
			}).catch(reject);
		});
	}

	noteToPostParams_(note) {
		const titleObj = this.splitNoteTitle_(note.meta.title);
		return {
			post: {
				name: titleObj.name,
				tags: titleObj.tags,
				category: titleObj.category,
				body_md: note.content.cells[0].data,
				wip: note.hasTag(this.tagPrefix + '@' + ESA_TAG_ATTR_WIP),
				message: 'Updated by Quiver.' +
									(note.hasTag(this.tagPrefix + '@' + ESA_TAG_ATTR_NOTICE) ?
									 '' : ESA_MSG_SKIP_NOTICE)
			}
		};
	}

	collectNotesToPush_(notes) {
		const promises = [];

		notes.forEach(note => {
			const params = this.noteToPostParams_(note);

			if (note.esa && note.isUpdated()) {
				// set original_revision to enable server side merge
				params.post.original_revision = {
					body_md: note.esa.body_md,
					number: note.esa.number,
					user: note.esa.updated_by.screen_name
				};
				promises.push(new Promise((resolve, reject) => {
					this.esa.api.updatePost(note.esa.number, params, (err, res) => {
						if (err) return reject(err);
						res.note = note;
						resolve(res);
					});
				}));
			} else {
				promises.push(new Promise((resolve, reject) => {
					this.esa.api.createPost(params, (err, res) => {
						if (err) return reject(err);
						res.note = note;
						resolve(res);
					});
				}));
			}
		});

		return promises;
	}

	constructNoteTags_(post) {
		let tag = this.tagPrefix;
		let tags = [];

		if (tag) {
			tags.push(tag);
		} else {
			tags.push('/');
		}

		if (post.category) {
			// 'a/b/c' => ['a', 'a/b', 'a/b/c']
			post.category.split('/').forEach(category => {
				tag += '/' + category;
				tags.push(tag);
			});
		}

		if (post.tags instanceof Array) {
			tags = tags.concat(post.tags);
		}

		if (post.wip) {
			// @wip represents that the post has 'wip' attribute
			tags.push(this.tagPrefix + '@' + ESA_TAG_ATTR_WIP);
		}

		return tags;
	}

	splitNoteTitle_(titleString) {
		const categoryPart = titleString.split('/');
		const category = categoryPart.slice(0, -1).join('/');
		let tagPart = (' ' + categoryPart.pop()).split(/\s+#/);
		const name = tagPart.shift().trim();
		tagPart = tagPart.map(tag => tag.split(/\s+/)[0]);
		if (tagPart.length === 0) {
			// esa api v1 require [''] to remove all tags
			tagPart = [''];
		}

		return {
			name: name,
			category: category,
			tags: tagPart
		};
	}

	getNoteFromPost_(post) {
		const bookUuid = this.book.uuid.split('-')[0];
		const postId = ('00000' + post.number).slice(-6);
		const uuidSrc = `${ESA_UUID_PREFIX}${this.esa.team}-${bookUuid}-${postId}`;
		const uuid = makeMd5Uuid(uuidSrc);

		const note = this.book.getNote(uuid) ?
		             this.book.getNote(uuid):
		             this.book.newNote(uuid);
		return note;
	}

	getPostState_(post) {
		const note = this.getNoteFromPost_(post);

		if (!note.esa) {
			return PostState.NEW;
		} else if (note.esa.revision_number < post.revision_number) {
			if (note.isUpdated()) {
				return PostState.BOTH_UPDATED;
			} else {
				return PostState.UPDATE;
			}
		} else {
			return PostState.LATEST;
		}
	}

	savePost_(post) {
		const note = this.getNoteFromPost_(post);

		note.setEsa(post);
		note.setTitle(post.full_name);
		note.setBody(post.body_md);
		note.setTags(this.constructNoteTags_(post));
		note.save();
	}

};
