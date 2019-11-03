const express = require("express");
const MongoClient = require('mongodb').MongoClient;
const request = require('request-promise');
const cheerio = require('cheerio');
const app = express();

const url = 'http://medium.com';

const uri = 'mongodb+srv://ronrumao:ronrumao@crawler-y4una.mongodb.net/test?retryWrites=true&w=majority';
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect(err => {
    const collection = client.db('crawler').collection('links');
    doAgain(url);
    async function doAgain(urlLink) {
        try {
            const mainHtml = await request(urlLink);
            const $ = cheerio.load(mainHtml);
            const links = $('a').map((i, link) => {
                const parameterList = [];
                let linkWithParams = $(link).attr('href');
                if (linkWithParams.startsWith('/')) {
                    linkWithParams = url + linkWithParams;
                }
                const href = linkWithParams.split('?');
                if (href[1]) {
                    const params = href[1].split('&');
                    params.forEach(p => {
                        const parameter = p.split('=');
                        parameterList.push(parameter[0]);
                    });
                }
                const linkObj = {
                    link: href[0],
                    parameters: parameterList
                };
                try {
                    collection.findOneAndUpdate(
                        { link: linkObj.link },
                        { $set: linkObj, $inc: { count: 1 } },
                        { sort: { count: 1 }, upsert: true, returnNewDocument: true }
                    );
                } catch (e) {
                    console.log('error occoured', e);
                }
                return linkWithParams;
            }).get();


            await Promise.all(links.map(async (lnk) => {
                doAgain(lnk);
            }))
        } catch (e) {
            console.log('error occoured', e);
        }
    };

    // client.close();
});
exports.app = app;
