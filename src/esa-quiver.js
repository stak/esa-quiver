const esaLib = require('esa-nodejs');
const crypto = require('crypto');
import QuiverBook from './quiver';

const ESA_UUID_PREFIX = 'esa-';
const ESA_TAG_DEFAULT_PREFIX = '${TEAM}';
const ESA_TAG_ATTR_WIP = 'wip';

function makeMd5Uuid(src) {
  const md5hash = crypto.createHash('md5');
  md5hash.update(src, 'binary');
  const md5str = md5hash.digest('hex').toUpperCase();
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

		this.tagPrefix = (config.tagPrefix ?
		                 config.tagPrefix:
		                 ESA_TAG_DEFAULT_PREFIX).replace('${TEAM}', this.esa.team);
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
		this.esa.api.posts({per_page: 100, page: 1}, (err, res) => {
			if (err) {
				console.log(err);
				return;
			}
			res.body.posts.forEach(post => {
				this.postToNote_(post);
			});
		});
	}

	push() {

	}

	constructNoteTags_(post) {
		let tag = this.tagPrefix;
		let tags = [tag];

		if (post.category) {
			post.category.split('/').forEach(category => {
				tag = tag + '/' + category;
				tags.push(tag);
			});
		}

		// TODO: post.tags

		if (post.wip) {
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

		if (!note.esa || note.esa.revision_number < post.revision_number) {
			note.setEsa(post);
			note.setTitle(post.full_name);
			note.setBody(post.body_md);
			note.setTags(this.constructNoteTags_(post));

			note.save();

			console.log(`Sync: ${post.full_name}`);
		} else {
			console.log(`Pass: ${post.full_name}`);
		}
	}

};
