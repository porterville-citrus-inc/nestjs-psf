import { expect } from "chai";
import supertest = require("supertest");
import { TestFactory } from "./factories";
import { app } from "./helper";

let testFactory = new TestFactory();

describe('Pagination', () => {
	context('with no results', () => {
		it('returns the correct links and metainformation', async () => {
			const res = await supertest(app.getHttpServer())
				.get('/tests')
				.expect(200);

			const { body } = res;

			expect(body.meta.pageCount).eq(0);
			expect(body.meta.pageSize).eq(10);
			expect(body.meta.page).eq(1);
			expect(body.meta.count).eq(0);

			expect(body.links.first).to.contain('page=1')
			expect(body.links.last).to.contain('page=1')
			expect(body.links.prev).to.be.null;
			expect(body.links.next).to.be.null;
		});
	});

	context('with results', () => {
		it('paginates correctly', async () => {
			await testFactory.createMany(9);

			const res = await supertest(app.getHttpServer())
				.get('/tests?pageSize=2&page=2')
				.expect(200);

			const { body } = res;

			expect(body.results).to.have.length(2);

			expect(body.meta.pageCount).to.eq(5);
			expect(body.meta.pageSize).to.eq(2);
			expect(body.meta.page).to.eq(2);
			expect(body.meta.count).to.eq(9);

			expect(body.links.first).to.contain('page=1')
			expect(body.links.last).to.contain('page=5')
			expect(body.links.prev).to.contain('page=1')
			expect(body.links.next).to.contain('page=3')
		});
	});
});

describe('Filter and Sort', () => {
	it('can filter', async () => {
		await testFactory.create({ name: 'find me!' });
		await testFactory.create({ name: 'but not me' });

		const res = await supertest(app.getHttpServer())
			.get('/tests?filter=name__startswith:find')

		const { body } = res;

		expect(body.results.length).to.eq(1);
		expect(body.results[0].name).to.eq('find me!');
	});

	it('can do multiple filters, which are ANDed', async () => {
		await testFactory.create({ name: 'find me!', email: 'find@me.com' });

		const res = await supertest(app.getHttpServer())
			.get('/tests?filter=name__icontains:ME,email__endswidth=find@me.com')

		const { body } = res;

		expect(body.results.length).to.eq(1);
	});

	it('can "not equals" filter', async () => {
		await testFactory.create({ name: 'thing' });

		const res = await supertest(app.getHttpServer())
			.get('/tests?filter=name__neq:notathing')

		const { body } = res;

		expect(body.results.length).to.eq(1);
	});

	it('can filter dates', async () => {
		const past = await testFactory.create();
		past.createdAt = new Date('2000-01-05');
		await past.save();

		const future = await testFactory.create();
		future.createdAt = new Date('2050-05-10');
		await future.save();

		const middle = new Date('2025-02-10');
		const url = `/tests?filter=createdAt__lt:${(middle.toISOString())}`;
		const res = await supertest(app.getHttpServer())
			.get(url)

		const { body } = res;

		expect(body.results.length).to.eq(1);
		expect(body.results[0].id).to.eq(past.id);
	});

	it('can sort', async () => {
		await testFactory.create({ name: 'b' });
		await testFactory.create({ name: 'a' });
		await testFactory.create({ name: 'c' });

		const res = await supertest(app.getHttpServer())
			.get('/tests?sort=name')

		const { body } = res;

		expect(body.results[0].name).to.eq('a');
		expect(body.results[1].name).to.eq('b');
		expect(body.results[2].name).to.eq('c');
	});

	it('can sort via multiple properties', async () => {
		await testFactory.create({ name: 'same', email: 'b@b.com' });
		await testFactory.create({ name: 'same', email: 'a@a.com' });

		const res = await supertest(app.getHttpServer())
			.get('/tests?sort=name,email')

		const { body } = res;

		expect(body.results[0].email).to.eq('a@a.com');
		expect(body.results[1].email).to.eq('b@b.com');
	});

	it('can reverse sort', async () => {
		await testFactory.create({ name: 'b' });
		await testFactory.create({ name: 'a' });
		await testFactory.create({ name: 'c' });

		const res = await supertest(app.getHttpServer())
			.get('/tests?sort=-name')

		const { body } = res;

		expect(body.results[0].name).to.eq('c');
		expect(body.results[1].name).to.eq('b');
		expect(body.results[2].name).to.eq('a');
	});
});
