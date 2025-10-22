import { defineEntity, p, MikroORM } from '@mikro-orm/sqlite';

const Author = defineEntity({
  name: 'Author',
  properties: {
    id: p.integer().primary(),
    name: p.string(),
    email: p.string().unique(),
    books: () => p.oneToMany(Book).mappedBy('author'),
  },
});

const Book = defineEntity({
  name: 'Book',
  properties: {
    id: p.integer().primary(),
    title: p.string(),
    author: () => p.manyToOne(Author).inversedBy('books'),
    tags: () => p.manyToMany(BookTag),
  },
});

const BookTag = defineEntity({
  name: 'BookTag',
  properties: {
    id: p.integer().primary(),
    name: p.string(),
    books: () => p.manyToMany(Book).mappedBy('tags'),
  },
});

test('collection operators', async () => {
  const orm = MikroORM.initSync({
    entities: [Author, Book, BookTag],
    dbName: ':memory:',
    debug: true,
  });
  await orm.schema.createSchema();
  const em = orm.em.fork();

  await em.insertMany(Author, [
    { id: 1, name: 'Author 1', email: 'author1@example.com' },
    { id: 2, name: 'Author 2', email: 'author2@example.com' },
  ]);

  await em.insertMany(BookTag, [
    { id: 1, name: 'Fiction' },
    { id: 2, name: 'Science' },
    { id: 3, name: 'Fantasy' },
  ]);

  await em.insertMany(Book, [
    { id: 1, title: 'Book 1', author: 1, tags: [1, 3] },
    { id: 2, title: 'Book 2', author: 1, tags: [2, 3] },
    { id: 3, title: 'Book 3', author: 2, tags: [1, 2, 3] },
  ]);

  // returns 'Book 1' and 'Book 3'
  const books = await em.findAll(Book, {
    where: {
      $and: [
        { tags: { $some: { name: 'Fiction' } } },
        { tags: { $some: { name: 'Fantasy' } } },
      ],
    },
    populate: ['tags'],
  });

  for (const book of books) {
    console.log(book.title, book.tags.map(t => t.name));
  }

  await orm.close();
});
