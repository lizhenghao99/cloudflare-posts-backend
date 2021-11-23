import { Router } from 'itty-router';
import { v4 as uuid } from 'uuid';
import { postSchema } from './schema';

// Create a new router
const router = Router();

/*
Our index route, a simple hello world.
*/
router.get('/', () => {
    return new Response('Hello, world! This is the root page of your Worker template.');
});

router.get('/posts', async () => {
    let list = await POSTS_KV.list();
    const keys = [];
    list.keys.forEach(value => keys.push(value.name));
    while (!list.list_complete) {
        const cursor = list.cursor;
        list = await POSTS_KV.list({ cursor });
        list.keys.forEach(value => keys.push(value.name));
    }

    const data = await Promise.all(keys.map(value => POSTS_KV.get(value)));
    const posts = data.map(value => JSON.parse(value));

    return new Response(JSON.stringify(posts), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
});

router.post('/post', async request => {
    let post = {};

    if (request.headers.get('Content-Type') === 'application/json') {
        post = await request.json();
    }

    const isValid = await postSchema.isValid(post);

    let returnData = post;
    let returnStatus = 201;

    if (isValid) {
        const id = uuid();
        await POSTS_KV.put(`${post.username}:${id}`, JSON.stringify(post));
    } else {
        returnData = {
            status: 'error',
            message: 'title, username, and content fields are required',
        };
        returnStatus = 400;
    }

    return new Response(JSON.stringify(returnData), {
        headers: {
            'Content-Type': 'application/json',
        },
        status: returnStatus,
    });
});

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).

Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all('*', () => new Response('404, not found!', { status: 404 }));

/*
This snippet ties our worker to the router we defined above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', (e) => {
    e.respondWith(router.handle(e.request));
});
