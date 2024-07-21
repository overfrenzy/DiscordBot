const fs = require('fs');
const path = require('path');

const getAllFiles = (dir, includeSubfolders = false) => {
  let files = [];
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory() && includeSubfolders) {
      files = [...files, ...getAllFiles(filePath, includeSubfolders)];
    } else if (file.endsWith('.js')) {
      files.push(filePath);
    }
  });
  return files;
};

module.exports = (client) => {
  const eventFolders = fs.readdirSync(path.join(__dirname, '..', 'events'));

  for (const folder of eventFolders) {
    const eventFiles = getAllFiles(path.join(__dirname, '..', 'events', folder));

    for (const file of eventFiles) {
      const event = require(file);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    }
  }
};
