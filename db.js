const sqlite = require('better-sqlite3');

module.exports = (location) => {
  const db = sqlite(location);

  db.exec(`
    create table if not exists image (
      id text primary key not null,
      fileName text,
      width int,
      height int,
      originalPath text,
      thumbnailPath text,
      url text,
      comment text
    );
    create table if not exists tag (
      id text primary key not null,
      name text
    );
    create table if not exists imageTag (
      imageId text,
      tagId text,
      FOREIGN KEY(imageId) REFERENCES image(id),
      FOREIGN KEY(tagId) REFERENCES tag(id)
    )
  `);

  return db;
}