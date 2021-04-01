import path from 'path';
// import tiddlywiki from 'tiddlywiki';

export function startNodeJSWiki(
  { homePath, tiddlyWikiPort = 5112, userName } = {
    homePath: path.join(__dirname, '..', 'template', 'wiki'),
    userName: 'LinOnetwo',
  }
) {
  return new Promise((resolve, reject) => {
    const $tw = require('@tiddlygit/tiddlywiki').TiddlyWiki();
    try {
      // process.env.TIDDLYWIKI_PLUGIN_PATH = path.resolve(homePath, 'plugins');
      process.env.TIDDLYWIKI_THEME_PATH = path.resolve(homePath, 'themes');
      // add tiddly filesystem back https://github.com/Jermolene/TiddlyWiki5/issues/4484#issuecomment-596779416
      $tw.boot.argv = [
        '+plugins/tiddlywiki/filesystem',
        '+plugins/tiddlywiki/tiddlyweb',
        homePath,
        '--listen',
        `anon-username=${userName}`,
        `port=${tiddlyWikiPort}`,
        'host=0.0.0.0',
        'root-tiddler=$:/core/save/lazy-images',
      ];
      $tw.boot.boot(() => resolve(`Tiddlywiki booted at http://localhost:${tiddlyWikiPort}`));
    } catch (error) {
      console.error(error);
      reject(`Tiddlywiki booted failed with error ${error.message} ${error.stack}`);
    }
  });
}
