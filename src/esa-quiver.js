const esaLib = require('esa-nodejs');
const crypto = require('crypto');
import QuiverBook from './quiver';

const ESA_UUID_PREFIX = 'esa-';
const ESA_TAG_DEFAULT_PREFIX = '${TEAM}';
const ESA_TAG_ATTR_WIP = 'wip';
const ESA_PAGE_PER_REQUEST = 100;

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

	fetch(page = 1) {
		return new Promise((resolve, reject) => {
			const params = {
				per_page: ESA_PAGE_PER_REQUEST,
				page: page
			};
			this.esa.api.posts(params, (err, res) => {
				if (err) return reject(err);

				let syncContinue = true;
				res.body.posts.forEach(post => {
					if (this.postToNote_(post)) {
						console.log(`Fetch: ${post.full_name}`);
					} else {
						console.log(`Pass: ${post.full_name}`);
						syncContinue = false;
					}
				});
				if (syncContinue && res.body.next_page) {
					// async recursion to fetch all updated pages
					this.fetch(res.body.next_page)
					    .then(resolve, reject);
				} else {
					resolve();
				}
			});
		});
	}

	push() {

	}

	constructNoteTags_(post) {
		let tag = this.tagPrefix;
		let tags = [tag];

		if (post.category) {
			// 'a/b/c' => ['a', 'a/b', 'a/b/c']
			post.category.split('/').forEach(category => {
				tag += '/' + category;
				tags.push(tag);
			});
		}

		// TODO: post.tags

		if (post.wip) {
			// @wip represents that the post has 'wip' attribute
			tags.push(this.tagPrefix + '@' + ESA_TAG_ATTR_WIP);
		}

		return tags;
	}

	postToNote_(post) {
		const bookUuid = this.book.uuid.split('-')[0];
		const postId = ('00000' + post.number).slice(-6);
		const uuidSrc = `${ESA_UUID_PREFIX}${this.esa.team}-${bookUuid}-${postId}`;
		const uuid = makeMd5Uuid(uuidSrc);

		const note = this.book.getNote(uuid) ?
		             this.book.getNote(uuid):
		             this.book.addNote(uuid);
		if (!note) throw new Error('Failed to get quiver notes.');

		// note is new or note has been updated
		if (!note.esa || note.esa.revision_number < post.revision_number) {
			note.setEsa(post);
			note.setTitle(post.full_name);
			note.setBody(post.body_md);
			note.setTags(this.constructNoteTags_(post));

			note.save();
			return true;
		} else {
			return false;
		}
	}

};
