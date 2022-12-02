DROP TABLE IF EXISTS gypsum_files;
CREATE TABLE IF NOT EXISTS gypsum_files (
    id TEXT PRIMARY KEY, 
    project TEXT NOT NULL,
    relpath TEXT NOT NULL,
    version TEXT NOT NULL
);

DROP TABLE IF EXISTS gypsum_meta_text;
CREATE TABLE IF NOT EXISTS gypsum_meta_text (
    id TEXT NOT NULL,
    field TEXT NOT NULL,
    contents TEXT NOT NULL,
    FOREIGN KEY(id) REFERENCES gypsum_files(id)
);
