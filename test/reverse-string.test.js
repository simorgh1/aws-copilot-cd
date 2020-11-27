var superagent = require("superagent")
var expect = require("expect")

// set default value if env var API_URL is missing
const api_url = process.env.API_URL || 'http://localhost:3000'

console.log('api_url is: ', api_url)

test('Should respond at specified api url', async () => {
    const status = await (await superagent(api_url)).status
    expect(status).toEqual(200);
});

test('Should be able to reverse a string.', async () => {
    const res = await superagent.post(api_url).send('Hello');
    expect(res.text).toEqual('olleH');
});