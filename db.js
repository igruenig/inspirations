const sqlite = require('better-sqlite3');

module.exports = (location) => {
  const db = sqlite(location);

  db.exec(`
    create table if not exists images (
      id text primary key not null,
      fileName text,
      width int,
      height int,
      originalPath text,
      thumbnailPath text,
      url text,
      comment text,
      createdAt datetime default current_timestamp
    );
    create table if not exists tags (
      id text primary key not null,
      name text
    );
    create table if not exists taggings (
      imageId text,
      tagId text,
      FOREIGN KEY(imageId) REFERENCES images(id),
      FOREIGN KEY(tagId) REFERENCES tags(id)
    );
    create unique index if not exists idx_tags_name on tags (name);
    create unique index if not exists idx_taggings on taggings (imageId, tagId);
  `);

  return db;
}